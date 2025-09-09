import { Document, Types } from "mongoose";
import { MessageTypeEnum } from "../enums/message.enum";

export type MessageType = MessageTypeEnum;

export interface IMessage extends Document {
   conversationId: Types.ObjectId;
   senderId: Types.ObjectId;
   content?: string;
   attachments?: string[];
   messageType?: MessageType;
   createdAt?: Date;
   isReadBy?: Types.ObjectId[];
}
