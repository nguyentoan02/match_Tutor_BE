import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import notificationController from "../controllers/notification.controller";
import {
   notificationParamsSchema,
   notificationQuerySchema,
} from "../schemas/notifcation.schema";

const router = Router();

// Get notifications with pagination
router.get(
   "/",
   authenticate,
   validate(notificationQuerySchema),
   notificationController.getNotifications
);

// Get unread notifications count
router.get(
   "/unread-count",
   authenticate,
   notificationController.getUnreadCount
);

// Mark notification as read
router.patch(
   "/:notificationId/read",
   authenticate,
   validate(notificationParamsSchema),
   notificationController.markAsRead
);

router.patch(
   "/mark-all-read",
   authenticate,
   notificationController.markAllAsRead
);

// Mark all notifications as read
router.put("/read-all", authenticate, notificationController.markAllAsRead);

// Delete specific notification
router.delete(
   "/:notificationId",
   authenticate,
   validate(notificationParamsSchema),
   notificationController.deleteNotification
);

// Delete all notifications
router.delete("/", authenticate, notificationController.deleteAllNotifications);

export default router;
