import mongoose, { Schema } from "mongoose";
import { ISession } from "../types/types/session";
import {
   SESSION_STATUS_VALUES,
   SessionStatus,
} from "../types/enums/session.enum";
import { getVietnamTime } from "../utils/date.util";
import { REMINDER_METHOD_VALUES } from "../types/enums/reminder.enum";

const SessionSchema: Schema<ISession> = new Schema(
   {
      teachingRequestId: {
         type: Schema.Types.ObjectId,
         ref: "TeachingRequest",
         required: true,
      },
      startTime: { type: Date, required: true },
      endTime: { type: Date, required: true },
      status: {
         type: String,
         enum: SESSION_STATUS_VALUES,
         default: SessionStatus.SCHEDULED,
      },
      isTrial: { type: Boolean, default: false },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
      materials: [{ type: Schema.Types.ObjectId, ref: "Material" }],
      quizIds: [{ type: Schema.Types.ObjectId, ref: "Quiz" }],
      reminders: [
         {
            userId: { type: Schema.Types.ObjectId, ref: "User" },
            minutesBefore: { type: Number },
            methods: [{ type: String, enum: REMINDER_METHOD_VALUES }],
            _id: false,
         },
      ],
      location: { type: String },
      notes: { type: String },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "sessions",
   }
);

SessionSchema.index({ teachingRequestId: 1, startTime: 1 });

export default mongoose.model<ISession>("Session", SessionSchema);
