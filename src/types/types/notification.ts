import { Document, Types } from "mongoose";

export interface INotification extends Document {
   userId: Types.ObjectId;
   title?: string;
   message?: string;
   isRead?: boolean;
   createdAt?: Date;
}
