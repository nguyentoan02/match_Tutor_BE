import mongoose, { Schema } from "mongoose";
import { ISession } from "../types/types/session";
import {
   SESSION_STATUS_VALUES,
   SessionStatus,
} from "../types/enums/session.enum";
import { getVietnamTime } from "../utils/date.util";

const SessionSchema: Schema<ISession> = new Schema(
   {
      teachingRequestId: {
         type: Schema.Types.ObjectId,
         ref: "TeachingRequest",
         required: false, // Có thể optional nếu chuyển sang learningCommitment
      },
      learningCommitmentId: {
         type: Schema.Types.ObjectId,
         ref: "LearningCommitment",
         required: true, // Bắt buộc cho logic mới
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

      // Attendance window deadlines
      attendanceWindow: {
         tutorDeadline: { type: Date },
         studentDeadline: { type: Date },
         _id: false,
      },

      // Attendance logs for audit
      attendanceLogs: [
         {
            userRole: { type: String, enum: ["TUTOR", "STUDENT", "SYSTEM"] },
            action: {
               type: String,
               enum: [
                  "CHECKED_IN",
                  "ABSENT_AUTO",
                  "ABSENT_MANUAL",
                  "DISPUTE_OPENED",
               ],
            },
            note: { type: String },
            createdAt: { type: Date, default: getVietnamTime },
            _id: false,
         },
      ],

      // Absence resolution
      absence: {
         tutorAbsent: { type: Boolean },
         studentAbsent: { type: Boolean },
         decidedAt: { type: Date },
         reason: { type: String },
         evidenceUrls: [{ type: String }],
         _id: false,
      },

      // Dispute info
      dispute: {
         status: { type: String, enum: ["OPEN", "RESOLVED"] },
         openedBy: { type: Schema.Types.ObjectId, ref: "User" },
         reason: { type: String },
         evidenceUrls: [{ type: String }],
         openedAt: { type: Date },
         resolvedAt: { type: Date },
         resolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
         decision: { type: String, enum: ["COMPLETED", "NOT_CONDUCTED"] },
         adminNotes: { type: String },
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

      location: { type: String },
      notes: { type: String },
      mcqQuizIds: { type: [Schema.Types.ObjectId], ref: "Quiz", default: [] },
      saqQuizIds: { type: [Schema.Types.ObjectId], ref: "Quiz", default: [] },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "sessions",
   }
);

SessionSchema.index({ teachingRequestId: 1, startTime: 1 });

SessionSchema.index({ learningCommitmentId: 1, startTime: 1, status: 1 });

// Index này phục vụ cho việc đếm Status (Pie chart)
SessionSchema.index({ learningCommitmentId: 1, status: 1 });

export default mongoose.model<ISession>("Session", SessionSchema);
