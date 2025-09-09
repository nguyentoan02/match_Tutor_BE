import mongoose, { Schema } from "mongoose";
import { INotification } from "../types/types/notification";
import { getVietnamTime } from "../utils/date.util";
import { NOTIFICATION_TYPE_VALUES } from "../types/enums/notification.enum";

const NotificationSchema: Schema<INotification> = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      type: { type: String, enum: NOTIFICATION_TYPE_VALUES },
      title: { type: String },
      message: { type: String },
      data: { type: Object },
      isRead: { type: Boolean, default: false },
   },
   {
      timestamps: {
         createdAt: true,
         updatedAt: false,
         currentTime: getVietnamTime,
      },
      collection: "notifications",
   }
);

NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export default mongoose.model<INotification>(
   "Notification",
   NotificationSchema
);
