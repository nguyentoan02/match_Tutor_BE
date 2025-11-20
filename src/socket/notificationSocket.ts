import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model";
import Notification from "../models/notification.model";
import { INotification } from "../types/types/notification";

declare module "socket.io" {
   interface Socket {
      userId: string;
      user: any;
   }
}

interface NotificationData {
   userId: string;
   type: string;
   title: string;
   message: string;
}

class NotificationSocketService {
   private io: Server | null;
   private connectedUsers: Map<string, string>;

   constructor() {
      this.io = null;
      this.connectedUsers = new Map();
   }

   setIO(io: Server) {
      this.io = io;
      this.setupNotificationHandlers();
   }

   private setupNotificationHandlers() {
      if (!this.io) return;

      this.io.on("connection", (socket: Socket) => {
         const s = socket as Socket & { userId?: string; user?: any };

         if (s.user && s.userId) {
            // Store connected user
            this.connectedUsers.set(s.userId, s.id);

            // Join user to their personal notification room
            s.join(`notifications_${s.userId}`);

            console.log(`User ${s.userId} joined notification room`);
         }

         // Handle marking notification as read
         s.on("markNotificationRead", async (notificationId: string) => {
            await this.handleMarkAsRead(s, notificationId);
         });

         // Handle getting unread notification count
         s.on("getUnreadCount", async () => {
            await this.handleGetUnreadCount(s);
         });

         s.on("disconnect", () => {
            if (s.userId) {
               this.connectedUsers.delete(s.userId);
               console.log(`User ${s.userId} disconnected from notifications`);
            }
         });
      });
   }

   private async handleMarkAsRead(
      socket: Socket & { userId?: string },
      notificationId: string
   ) {
      try {
         if (!socket.userId) return;

         await Notification.findByIdAndUpdate(
            notificationId,
            { isRead: true },
            { new: true }
         );

         socket.emit("notificationMarkedRead", { notificationId });

         await this.sendUnreadCount(socket.userId);
      } catch (error) {
         console.error("Error marking notification as read:", error);
         socket.emit("notification_error", {
            message: "Failed to mark notification as read",
         });
      }
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

   private async sendUnreadCount(userId: string) {
      try {
         const unreadCount = await Notification.countDocuments({
            userId: userId,
            isRead: false,
         });

         this.io?.to(`notifications_${userId}`).emit("unreadCount", {
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
            type: notificationData.type,
            title: notificationData.title,
            message: notificationData.message,
            isRead: false,
         });

         await notification.save();

         // Populate user data if needed
         await notification.populate({
            path: "userId",
            select: "name email avatarUrl",
         });

         // Send to user's notification room
         this.io?.to(`notifications_${userId}`).emit("newNotification", {
            notification: notification.toObject(),
         });

         // Send updated unread count
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

   // Check if user is online
   isUserOnline(userId: string): boolean {
      return this.connectedUsers.has(userId);
   }

   // Get all connected user IDs
   getConnectedUserIds(): string[] {
      return Array.from(this.connectedUsers.keys());
   }
}

export default new NotificationSocketService();
