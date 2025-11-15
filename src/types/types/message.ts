import { Document, Types } from "mongoose";

export interface IMessage extends Document {
   conversationId: Types.ObjectId;
   senderId: Types.ObjectId;
   content: string;
   isReadBy: Types.ObjectId[];
   createdAt: Date;
}
