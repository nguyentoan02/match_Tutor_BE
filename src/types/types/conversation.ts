import { Document, Types } from "mongoose";

export interface IConversation extends Document {
   participants: Types.ObjectId[];
   lastMessageAt?: Date;
   lastMessage?: Types.ObjectId;
   isActive: boolean;
   createdAt: Date;
   updatedAt: Date;
}
