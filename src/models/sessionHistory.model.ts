import mongoose, { Schema } from "mongoose";
import { ISessionHistory } from "../types/types/sessionHistory";
import { getVietnamTime } from "../utils/date.util";

const SessionHistorySchema: Schema<ISessionHistory> = new Schema(
   {
      sessionId: {
         type: Schema.Types.ObjectId,
         ref: "Session",
         required: true,
      },
      teachingRequestId: {
         type: Schema.Types.ObjectId,
         ref: "TeachingRequest",
      },
      changedBy: { type: Schema.Types.ObjectId, ref: "User" },
      action: { type: String, required: true },
      summary: { type: String },
      changes: { type: Object },
      meta: { type: Object },
   },
   {
      timestamps: {
         createdAt: true,
         updatedAt: false,
         currentTime: getVietnamTime,
      },
      collection: "session_history",
   }
);

SessionHistorySchema.index({ sessionId: 1, createdAt: -1 });

export default mongoose.model<ISessionHistory>(
   "SessionHistory",
   SessionHistorySchema
);
