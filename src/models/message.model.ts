import mongoose, { Schema } from "mongoose";
import { IMessage } from "../types/types/message";
import { getVietnamTime } from "../utils/date.util";
import {
   MESSAGE_TYPE_VALUES,
   MessageTypeEnum,
} from "../types/enums/message.enum";

const MessageSchema: Schema<IMessage> = new Schema(
   {
      conversationId: {
         type: Schema.Types.ObjectId,
         ref: "Conversation",
         required: true,
      },
      senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      content: { type: String },
      attachments: [{ type: String }],
      messageType: {
         type: String,
         enum: MESSAGE_TYPE_VALUES,
         default: MessageTypeEnum.TEXT,
      },
      isReadBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
   },
   {
      timestamps: {
         createdAt: true,
         updatedAt: false,
         currentTime: getVietnamTime,
      },
      collection: "messages",
   }
);

MessageSchema.index({ conversationId: 1, createdAt: 1 });

export default mongoose.model<IMessage>("Message", MessageSchema);
