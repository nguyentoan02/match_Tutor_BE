import mongoose, { Schema } from "mongoose";
import { INotification } from "../types/types/notification";
import { getVietnamTime } from "../utils/date.util";

const NotificationSchema: Schema<INotification> = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      title: { type: String },
      message: { type: String },
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
