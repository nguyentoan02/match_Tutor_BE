import mongoose, { Schema } from "mongoose";
import { IConversation } from "../types/types/conversation";
import { getVietnamTime } from "../utils/date.util";

const ConversationSchema: Schema<IConversation> = new Schema(
   {
      participants: [{ type: Schema.Types.ObjectId, ref: "User" }],
      lastMessageAt: { type: Date },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "conversations",
   }
);

ConversationSchema.index({ participants: 1 });

export default mongoose.model<IConversation>(
   "Conversation",
   ConversationSchema
);
