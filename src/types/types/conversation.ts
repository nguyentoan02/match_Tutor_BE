import { Document, Types } from "mongoose";

export interface IConversation extends Document {
   participants: Types.ObjectId[]; // user ids
   lastMessageAt?: Date;
   createdAt?: Date;
}
