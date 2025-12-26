import { Document, model, Schema, Types } from "mongoose";

// Định nghĩa enum trực tiếp trong file này
export enum CancellationStatus {
   PENDING = "PENDING",
   ACCEPTED = "ACCEPTED",
   REJECTED = "REJECTED",
}

export const CANCELLATION_STATUS_VALUES = Object.values(CancellationStatus);

export interface ICancellationDecision {
   student: { status: CancellationStatus; reason?: string; linkUrl?: string };
   tutor: { status: CancellationStatus; reason?: string; linkUrl?: string };
   requestedBy?: "student" | "tutor";
   requestedAt?: Date;
   reason?: string;
   adminReviewRequired?: boolean;
   adminResolvedBy?: Types.ObjectId;
   adminResolvedAt?: Date;
   adminNotes?: string;
}

export interface ICancellationDecisionHistory extends ICancellationDecision {
   resolvedDate?: Date; // Thời gian lưu vào history
}

export type LearningCommitmentStatus =
   | "pending_agreement"
   | "active"
   | "completed"
   | "cancelled"
   | "cancellation_pending"
   | "admin_review"
   | "rejected";

export interface IAdminDisputeLog {
   action:
      | "resolve_disagreement"
      | "approve_cancellation"
      | "reject_cancellation";
   admin: Types.ObjectId;
   notes?: string;
   handledAt: Date;
   statusAfter: LearningCommitmentStatus;
   cancellationDecisionSnapshot?: ICancellationDecision;
   linkUrl?: string; // <-- added
   _id?: Types.ObjectId;
}

export interface ILearningCommitment extends Document {
   tutor: Types.ObjectId;
   student: Types.ObjectId;
   teachingRequest: Types.ObjectId;
   totalSessions: number;
   sessionsPerWeek: number;
   startDate: Date;
   totalAmount: number;
   studentPaidAmount: number;
   status: LearningCommitmentStatus; // Thêm trạng thái này
   cancellationReason?: string;
   completedSessions: number;
   absentSessions: number;
   extendedWeeks: number;

   // Cancellation decision and history
   cancellationDecision?: ICancellationDecision;
   cancellationDecisionHistory?: ICancellationDecisionHistory[];
   adminDisputeLogs?: IAdminDisputeLog[];
   isMoneyTransferred: boolean; // Field to track money transfer status
}

const learningCommitmentSchema = new Schema<ILearningCommitment>(
   {
      tutor: { type: Schema.Types.ObjectId, ref: "Tutor", required: true },
      student: { type: Schema.Types.ObjectId, ref: "Student", required: true },
      teachingRequest: {
         type: Schema.Types.ObjectId,
         ref: "TeachingRequest",
         required: true,
      },
      totalSessions: { type: Number, required: true },
      sessionsPerWeek: { type: Number, required: true },
      startDate: { type: Date, required: true },
      totalAmount: { type: Number, required: true },
      studentPaidAmount: { type: Number, default: 0 },
      status: {
         type: String,
         enum: [
            "pending_agreement",
            "active",
            "completed",
            "cancelled",
            "cancellation_pending",
            "admin_review",
            "rejected", // Thêm trạng thái này
         ],
         default: "pending_agreement",
      },
      cancellationReason: { type: String },
      completedSessions: { type: Number, default: 0 },
      absentSessions: { type: Number, default: 0 },
      extendedWeeks: { type: Number, default: 0 },

      // Cancellation decision and history
      cancellationDecision: {
         student: {
            status: {
               type: String,
               enum: CANCELLATION_STATUS_VALUES,
               default: CancellationStatus.PENDING,
            },
            reason: { type: String },
            linkUrl: { type: String },
         },
         tutor: {
            status: {
               type: String,
               enum: CANCELLATION_STATUS_VALUES,
               default: CancellationStatus.PENDING,
            },
            reason: { type: String },
            linkUrl: { type: String },
         },
         requestedBy: { type: String, enum: ["student", "tutor"] },
         requestedAt: { type: Date },
         reason: { type: String },
         adminReviewRequired: { type: Boolean },
         adminResolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
         adminResolvedAt: { type: Date },
         adminNotes: { type: String },
      },
      cancellationDecisionHistory: [
         {
            student: {
               status: {
                  type: String,
                  enum: CANCELLATION_STATUS_VALUES,
                  default: CancellationStatus.PENDING,
               },
               reason: { type: String },
               linkUrl: { type: String },
            },
            tutor: {
               status: {
                  type: String,
                  enum: CANCELLATION_STATUS_VALUES,
                  default: CancellationStatus.PENDING,
               },
               reason: { type: String },
               linkUrl: { type: String },
            },
            requestedBy: { type: String, enum: ["student", "tutor"] },
            requestedAt: { type: Date },
            reason: { type: String },
            adminReviewRequired: { type: Boolean },
            adminResolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
            adminResolvedAt: { type: Date },
            adminNotes: { type: String },
            resolvedDate: { type: Date },
         },
      ],
      adminDisputeLogs: [
         {
            action: {
               type: String,
               enum: [
                  "resolve_disagreement",
                  "approve_cancellation",
                  "reject_cancellation",
               ],
               required: true,
            },
            admin: { type: Schema.Types.ObjectId, ref: "User", required: true },
            notes: { type: String },
            handledAt: { type: Date, default: Date.now },
            statusAfter: {
               type: String,
               enum: [
                  "pending_agreement",
                  "active",
                  "completed",
                  "cancelled",
                  "cancellation_pending",
                  "admin_review",
                  "rejected",
               ],
               required: true,
            },
            cancellationDecisionSnapshot: {
               student: {
                  status: {
                     type: String,
                     enum: CANCELLATION_STATUS_VALUES,
                     default: CancellationStatus.PENDING,
                  },
                  reason: { type: String },
                  linkUrl: { type: String }, // <-- added
               },
               tutor: {
                  status: {
                     type: String,
                     enum: CANCELLATION_STATUS_VALUES,
                     default: CancellationStatus.PENDING,
                  },
                  reason: { type: String },
                  linkUrl: { type: String }, // <-- added
               },
               requestedBy: { type: String, enum: ["student", "tutor"] },
               requestedAt: { type: Date },
               reason: { type: String },
               adminReviewRequired: { type: Boolean },
               adminResolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
               adminResolvedAt: { type: Date },
               adminNotes: { type: String },
            },
            linkUrl: { type: String }, // <-- added at adminDisputeLogs level
         },
      ],
      isMoneyTransferred: { type: Boolean, default: false },
   },
   { timestamps: true }
);

const LearningCommitment = model<ILearningCommitment>(
   "LearningCommitment",
   learningCommitmentSchema
);

// Giúp lấy danh sách hợp đồng của Tutor
// Thêm status vào để phục vụ query đếm status (Pie Chart)
learningCommitmentSchema.index({ tutor: 1, status: 1 });

// Nếu sau này Student cũng cần dashboard, thêm cái này:
learningCommitmentSchema.index({ student: 1, status: 1 });
export default LearningCommitment;
