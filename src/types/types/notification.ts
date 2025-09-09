import { Document, Types } from "mongoose";
import { NotificationTypeEnum } from "../enums/notification.enum";

export interface INotification extends Document {
   userId: Types.ObjectId;
   type?: NotificationTypeEnum;
   title?: string;
   message?: string;
   data?: Record<string, any>;
   isRead?: boolean;
   createdAt?: Date;
}
