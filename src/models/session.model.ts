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

      // Student confirmation for session participation
      studentConfirmation: {
         status: {
            type: String,
            enum: ["PENDING", "ACCEPTED", "REJECTED"],
            default: "PENDING",
         },
         confirmedAt: { type: Date },
         _id: false,
      },

      // Attendance confirmation after session (manual check-in by both parties)
      attendanceConfirmation: {
         tutor: {
            status: {
               type: String,
               enum: ["PENDING", "ACCEPTED", "REJECTED"],
               default: "PENDING",
            },
            decidedAt: { type: Date },
         },
         student: {
            status: {
               type: String,
               enum: ["PENDING", "ACCEPTED", "REJECTED"],
               default: "PENDING",
            },
            decidedAt: { type: Date },
         },
         // Finalization metadata: set when both have responded
         finalizedAt: { type: Date },
         // Convenience flag: true only if both status === "ACCEPTED"
         isAttended: { type: Boolean, default: false },
         _id: false,
      },

      // Cancellation info
      cancellation: {
         cancelledBy: { type: Schema.Types.ObjectId, ref: "User" },
         reason: { type: String },
         cancelledAt: { type: Date },
         _id: false,
      },

      // Soft delete
      isDeleted: { type: Boolean, default: false },
      deletedAt: { type: Date },
      deletedBy: { type: Schema.Types.ObjectId, ref: "User" },

      materials: [{ type: Schema.Types.ObjectId, ref: "Material" }],
      // thêm default [] để tránh lỗi khi push vào mảng null hoặc undefined
      // nếu không có trường này, khi tạo session mới, trường quizIds sẽ là undefined
      quizIds: { type: [Schema.Types.ObjectId], ref: "Quiz", default: [] },
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
