import { Document, Types } from "mongoose";

export interface IMessage extends Document {
   conversationId: Types.ObjectId;
   senderId: Types.ObjectId;
   content?: string;
   imageUrl?: string; // Deprecated, giữ để tương thích
   imageUrls?: string[]; // Thêm array
   isReadBy: Types.ObjectId[];
   createdAt: Date;
}
