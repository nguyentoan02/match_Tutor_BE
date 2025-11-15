import mongoose, { Schema } from "mongoose";
import { IConversation } from "../types/types/conversation";
import { getVietnamTime } from "../utils/date.util";

const ConversationSchema: Schema<IConversation> = new Schema(
   {
      participants: [
         { type: Schema.Types.ObjectId, ref: "User", required: true },
      ],
      lastMessageAt: { type: Date },
      lastMessage: { type: Schema.Types.ObjectId, ref: "Message" },

      isActive: { type: Boolean, default: true },
   },
   {
      timestamps: {
         createdAt: true,
         updatedAt: true,
         currentTime: getVietnamTime,
      },
      collection: "conversations",
   }
);

// Pre-save hook: Sort participants để đảm bảo unique index hoạt động
ConversationSchema.pre("save", function (next) {
   if (this.isModified("participants")) {
      this.participants.sort((a: any, b: any) =>
         a.toString().localeCompare(b.toString())
      );
   }
   next();
});

// Indexes
ConversationSchema.index({ participants: 1 }, { unique: true });
ConversationSchema.index({ lastMessageAt: -1 });

export default mongoose.model<IConversation>(
   "Conversation",
   ConversationSchema
);
