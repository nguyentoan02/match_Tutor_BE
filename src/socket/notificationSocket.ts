import { Namespace, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import Notification from "../models/notification.model";
import { INotification } from "../types/types/notification";
import { subscribeNotificationEvents } from "../events/notificationPubSub";

declare module "socket.io" {
   interface Socket {
      userId: string;
      user: any;
   }
}

interface NotificationData {
   userId: string;
   title: string;
   message: string;
}

class NotificationSocketService {
   private notificationNamespace: Namespace | null;
   private connectedUsers: Map<string, string>;

   constructor() {
      this.notificationNamespace = null;
      this.connectedUsers = new Map();
   }

   initialize(notificationNamespace: Namespace) {
      this.notificationNamespace = notificationNamespace;

      // Authentication middleware for notification namespace
      this.notificationNamespace.use(async (socket: Socket, next) => {
         try {
            const auth = socket.handshake.auth || {};
            const query = socket.handshake.query || {};
            const headers = socket.handshake.headers || {};

            // Get token from multiple sources
            let token = auth.token || query.token || headers.authorization;

            if (!token) {
               return next(new Error("No token provided"));
            }

            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
               return next(new Error("JWT secret is not configured"));
            }

            const rawToken =
               typeof token === "string" && token.startsWith("Bearer ")
                  ? token.split(" ")[1]
                  : (token as string);

            const decoded = jwt.verify(rawToken, jwtSecret) as { id: string };
            const user = (await User.findById(decoded.id).select(
               "-password"
            )) as any;

            if (!user) {
               return next(new Error("User not found"));
            }

            if (user.isBanned) {
               return next(new Error("User is banned"));
            }

            socket.userId = user._id.toString();
            socket.user = user;

            next();
         } catch (error) {
            if (error instanceof jwt.JsonWebTokenError) {
               console.error("JWT Error details:", error.message);
            }
            next(
               new Error("Authentication failed: " + (error as Error).message)
            );
         }
      });

      this.setupNotificationHandlers();
      this.setupPubSubBridge();
   }

   private setupPubSubBridge() {
      subscribeNotificationEvents(async (payload) => {
         if (!this.notificationNamespace) {
            console.warn(
               "Notification namespace not ready to deliver pub/sub event"
            );
            return;
         }

         try {
            if ("userIds" in payload) {
               await this.sendNotificationToUsers(payload.userIds, {
                  title: payload.title,
                  message: payload.message,
               });
            } else {
               await this.sendNotificationToUser(payload.userId, {
                  title: payload.title,
                  message: payload.message,
               });
            }
         } catch (error) {
            console.error(
               "Failed to deliver notification pub/sub event:",
               error
            );
         }
      });
   }

   private setupNotificationHandlers() {
      if (!this.notificationNamespace) return;

      this.notificationNamespace.on("connection", (socket: Socket) => {
         const s = socket as Socket & { userId?: string; user?: any };

         if (s.userId && s.user) {
            this.connectedUsers.set(s.userId, s.id);

            s.join(`notifications_${s.userId}`);

            this.sendUnreadCount(s.userId).catch((err) =>
               console.error("Error sending initial unread count:", err)
            );

            s.emit("notification_connected", {
               message: "Connected to notification service",
               userId: s.userId,
               namespace: "notifications",
               timestamp: new Date().toISOString(),
            });
         } else {
            s.emit("notification_error", {
               message: "Authentication failed",
               code: "AUTH_FAILED",
            });
            s.disconnect(true);
            return;
         }

         s.on("getUnreadCount", async () => {
            await this.handleGetUnreadCount(s);
         });

         s.on(
            "getNotifications",
            async (data: { page?: number; limit?: number }) => {
               await this.handleGetNotifications(s, data);
            }
         );

         s.on("disconnect", (reason) => {
            if (s.userId) {
               this.connectedUsers.delete(s.userId);
            }
         });

         s.on("error", (error) => {
            console.error("🚨 Notification socket error:", error);
         });
      });
   }

   private async handleGetUnreadCount(socket: Socket & { userId?: string }) {
      try {
         if (!socket.userId) return;
         await this.sendUnreadCount(socket.userId);
      } catch (error) {
         console.error("Error getting unread count:", error);
         socket.emit("notification_error", {
            message: "Failed to get unread count",
         });
      }
   }

   private async handleGetNotifications(
      socket: Socket & { userId?: string },
      data: { page?: number; limit?: number }
   ) {
      try {
         if (!socket.userId) return;

         const page = data.page || 1;
         const limit = data.limit || 20;
         const skip = (page - 1) * limit;

         const notifications = await Notification.find({
            userId: socket.userId,
         })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
               path: "userId",
               select: "name email avatarUrl",
            });

         const total = await Notification.countDocuments({
            userId: socket.userId,
         });

         socket.emit("notificationList", {
            notifications,
            pagination: {
               page,
               limit,
               total,
               pages: Math.ceil(total / limit),
            },
         });
      } catch (error) {
         console.error("Error getting notifications:", error);
         socket.emit("notification_error", {
            message: "Failed to get notifications",
         });
      }
   }

   private async sendUnreadCount(userId: string) {
      try {
         const unreadCount = await Notification.countDocuments({
            userId: userId,
            isRead: false,
         });

         this.notificationNamespace
            ?.to(`notifications_${userId}`)
            .emit("unreadCount", {
               count: unreadCount,
            });
      } catch (error) {
         console.error("Error sending unread count:", error);
      }
   }

   // Public method to send notification to specific user
   async sendNotificationToUser(
      userId: string,
      notificationData: Omit<NotificationData, "userId">
   ) {
      try {
         // Create notification in database
         const notification = new Notification({
            userId: userId,
            title: notificationData.title,
            message: notificationData.message,
            isRead: false,
         });

         await notification.save();

         await notification.populate({
            path: "userId",
            select: "name email avatarUrl",
         });

         this.notificationNamespace
            ?.to(`notifications_${userId}`)
            .emit("newNotification", {
               notification: notification.toObject(),
            });

         await this.sendUnreadCount(userId);

         return notification;
      } catch (error) {
         console.error("Error sending notification to user:", error);
         throw error;
      }
   }

   // Public method to send notification to multiple users
   async sendNotificationToUsers(
      userIds: string[],
      notificationData: Omit<NotificationData, "userId">
   ) {
      try {
         const notifications = [];

         for (const userId of userIds) {
            const notification = await this.sendNotificationToUser(
               userId,
               notificationData
            );
            notifications.push(notification);
         }

         return notifications;
      } catch (error) {
         console.error("Error sending notifications to users:", error);
         throw error;
      }
   }

   // Public method to broadcast notification to all connected users
   async broadcastNotification(
      notificationData: Omit<NotificationData, "userId">
   ) {
      try {
         const connectedUserIds = Array.from(this.connectedUsers.keys());

         if (connectedUserIds.length === 0) return [];

         return await this.sendNotificationToUsers(
            connectedUserIds,
            notificationData
         );
      } catch (error) {
         console.error("Error broadcasting notification:", error);
         throw error;
      }
   }

   // Check if user is online
   isUserOnline(userId: string): boolean {
      return this.connectedUsers.has(userId);
   }

   // Get connected users count
   getConnectedUsersCount(): number {
      return this.connectedUsers.size;
   }

   // Get all connected user IDs
   getConnectedUserIds(): string[] {
      return Array.from(this.connectedUsers.keys());
   }

   // Expose namespace for external usage
   getNamespace(): Namespace | null {
      return this.notificationNamespace;
   }

   // Legacy method for compatibility
   getIO(): Namespace | null {
      return this.notificationNamespace;
   }
}

export default new NotificationSocketService();
