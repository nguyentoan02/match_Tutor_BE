import { Document, model, Schema, Types } from "mongoose";

// Định nghĩa enum trực tiếp trong file này
export enum CancellationStatus {
   PENDING = "PENDING",
   ACCEPTED = "ACCEPTED",
   REJECTED = "REJECTED",
}

export const CANCELLATION_STATUS_VALUES = Object.values(CancellationStatus);

export interface ICancellationDecision {
   student: { status: CancellationStatus; reason?: string };
   tutor: { status: CancellationStatus; reason?: string };
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

export interface ILearningCommitment extends Document {
   tutor: Types.ObjectId;
   student: Types.ObjectId;
   teachingRequest: Types.ObjectId;
   totalSessions: number;
   startDate: Date;
   endDate: Date;
   totalAmount: number;
   studentPaidAmount: number;
   status:
      | "pending_agreement"
      | "active"
      | "completed"
      | "cancelled"
      | "cancellation_pending"
      | "admin_review";
   cancellationReason?: string;
   completedSessions: number;
   absentSessions: number;
   extendedWeeks: number;

   // Cancellation decision and history
   cancellationDecision?: ICancellationDecision;
   cancellationDecisionHistory?: ICancellationDecisionHistory[];
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
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
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
         },
         tutor: {
            status: {
               type: String,
               enum: CANCELLATION_STATUS_VALUES,
               default: CancellationStatus.PENDING,
            },
            reason: { type: String },
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
            },
            tutor: {
               status: {
                  type: String,
                  enum: CANCELLATION_STATUS_VALUES,
                  default: CancellationStatus.PENDING,
               },
               reason: { type: String },
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
      isMoneyTransferred: { type: Boolean, default: false },
   },
   { timestamps: true }
);

const LearningCommitment = model<ILearningCommitment>(
   "LearningCommitment",
   learningCommitmentSchema
);

export default LearningCommitment;
