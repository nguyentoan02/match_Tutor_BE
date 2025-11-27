import { Request, Response } from "express";
import Notification from "../models/notification.model";
import { OK } from "../utils/success.response";
import notificationSocketService from "../socket/notificationSocket";

class NotificationController {
   // Get notifications with pagination
   async getNotifications(req: Request, res: Response) {
      try {
         const userId = req.user?.id;
         if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
         }

         const page = parseInt(req.query.page as string) || 1;
         const limit = parseInt(req.query.limit as string) || 20;
         const skip = (page - 1) * limit;

         const notifications = await Notification.find({ userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate({
               path: "userId",
               select: "name email avatarUrl",
            });

         const total = await Notification.countDocuments({ userId });

         new OK({
            message: "Get notifications successfully",
            metadata: {
               notifications,
               pagination: {
                  page,
                  limit,
                  total,
                  pages: Math.ceil(total / limit),
               },
            },
         }).send(res);
      } catch (error) {
         console.error("Error getting notifications:", error);
         res.status(500).json({
            success: false,
            message: "Failed to get notifications",
         });
      }
   }

   // Get unread notifications count
   async getUnreadCount(req: Request, res: Response) {
      try {
         const userId = req.user?.id;
         if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
         }

         const unreadCount = await Notification.countDocuments({
            userId,
            isRead: false,
         });

         new OK({
            message: "Get unread count successfully",
            metadata: { count: unreadCount },
         }).send(res);
      } catch (error) {
         console.error("Error getting unread count:", error);
         res.status(500).json({
            success: false,
            message: "Failed to get unread count",
         });
      }
   }

   // Mark notification as read
   async markAsRead(req: Request, res: Response) {
      try {
         const userId = req.user?.id;
         const { notificationId } = req.params;

         if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
         }

         const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, userId },
            { isRead: true },
            { new: true }
         );

         if (!notification) {
            return res.status(404).json({
               success: false,
               message: "Notification not found",
            });
         }

         // Send updated unread count via socket if user is connected
         if (notificationSocketService.isUserOnline(userId)) {
            const unreadCount = await Notification.countDocuments({
               userId,
               isRead: false,
            });

            notificationSocketService
               .getIO()
               ?.to(`notifications_${userId}`)
               .emit("unreadCount", { count: unreadCount });
         }

         new OK({
            message: "Notification marked as read successfully",
            metadata: { notification },
         }).send(res);
      } catch (error) {
         console.error("Error marking notification as read:", error);
         res.status(500).json({
            success: false,
            message: "Failed to mark notification as read",
         });
      }
   }

   // Mark all notifications as read
   async markAllAsRead(req: Request, res: Response) {
      try {
         const userId = req.user?.id;
         if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
         }

         const result = await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true }
         );

         // Send updated unread count via socket if user is connected
         if (notificationSocketService.isUserOnline(userId)) {
            notificationSocketService
               .getIO()
               ?.to(`notifications_${userId}`)
               .emit("unreadCount", { count: 0 });
         }

         new OK({
            message: "All notifications marked as read successfully",
            metadata: {
               modifiedCount: result.modifiedCount,
            },
         }).send(res);
      } catch (error) {
         console.error("Error marking all notifications as read:", error);
         res.status(500).json({
            success: false,
            message: "Failed to mark all notifications as read",
         });
      }
   }

   // Delete notification
   async deleteNotification(req: Request, res: Response) {
      try {
         const userId = req.user?.id;
         const { notificationId } = req.params;

         if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
         }

         const notification = await Notification.findOneAndDelete({
            _id: notificationId,
            userId,
         });

         if (!notification) {
            return res.status(404).json({
               success: false,
               message: "Notification not found",
            });
         }

         // Send updated unread count via socket if user is connected
         if (notificationSocketService.isUserOnline(userId)) {
            const unreadCount = await Notification.countDocuments({
               userId,
               isRead: false,
            });

            notificationSocketService
               .getIO()
               ?.to(`notifications_${userId}`)
               .emit("unreadCount", { count: unreadCount });
         }

         new OK({
            message: "Notification deleted successfully",
            metadata: { deletedNotification: notification },
         }).send(res);
      } catch (error) {
         console.error("Error deleting notification:", error);
         res.status(500).json({
            success: false,
            message: "Failed to delete notification",
         });
      }
   }

   // Delete all notifications
   async deleteAllNotifications(req: Request, res: Response) {
      try {
         const userId = req.user?.id;
         if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
         }

         const result = await Notification.deleteMany({ userId });

         // Send updated unread count via socket if user is connected
         if (notificationSocketService.isUserOnline(userId)) {
            notificationSocketService
               .getIO()
               ?.to(`notifications_${userId}`)
               .emit("unreadCount", { count: 0 });
         }

         new OK({
            message: `${result.deletedCount} notifications deleted successfully`,
            metadata: {
               deletedCount: result.deletedCount,
            },
         }).send(res);
      } catch (error) {
         console.error("Error deleting all notifications:", error);
         res.status(500).json({
            success: false,
            message: "Failed to delete all notifications",
         });
      }
   }
}

export default new NotificationController();
