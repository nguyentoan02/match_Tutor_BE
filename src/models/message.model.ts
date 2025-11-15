import mongoose, { Schema } from "mongoose";
import { IMessage } from "../types/types/message";
import { getVietnamTime } from "../utils/date.util";

const MessageSchema: Schema<IMessage> = new Schema(
   {
      conversationId: {
         type: Schema.Types.ObjectId,
         ref: "Conversation",
         required: true,
      },
      senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      content: { type: String, required: true },
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

MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1 });

export default mongoose.model<IMessage>("Message", MessageSchema);
