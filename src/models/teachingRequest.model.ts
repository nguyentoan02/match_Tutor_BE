import mongoose, { Schema } from "mongoose";
import { ITeachingRequest } from "../types/types/teachingRequest";
import {
   TEACHING_REQUEST_STATUS_VALUES,
   DECISION_STATUS_VALUES,
   TeachingRequestStatus,
   DecisionStatus,
} from "../types/enums/teachingRequest.enum";
import { getVietnamTime } from "../utils/date.util";
import { SUBJECT_VALUES } from "../types/enums/subject.enum";
import { LEVEL_VALUES } from "../types/enums/level.enum";

const TeachingRequestSchema: Schema<ITeachingRequest> = new Schema(
   {
      studentId: {
         type: Schema.Types.ObjectId,
         ref: "Student",
         required: true,
      },
      tutorId: { type: Schema.Types.ObjectId, ref: "Tutor" },
      subject: { type: String, enum: SUBJECT_VALUES, required: true },
      level: { type: String, enum: LEVEL_VALUES, required: true },
      hourlyRate: { type: Number, required: true },
      description: { type: String },
      totalSessionsPlanned: { type: Number, min: 0 },
      trialSessionsCompleted: { type: Number, default: 0, min: 0 }, // Thêm trường này
      trialDecision: {
         student: {
            type: String,
            enum: DECISION_STATUS_VALUES,
            default: DecisionStatus.PENDING,
         },
         tutor: {
            type: String,
            enum: DECISION_STATUS_VALUES,
            default: DecisionStatus.PENDING,
         },
         _id: false,
      },
      status: {
         type: String,
         enum: TEACHING_REQUEST_STATUS_VALUES,
         default: TeachingRequestStatus.PENDING,
      },
      // Cancellation decision: who requested, when, reason, admin metadata
      cancellationDecision: {
         student: {
            type: String,
            enum: DECISION_STATUS_VALUES,
            default: DecisionStatus.PENDING,
         },
         tutor: {
            type: String,
            enum: DECISION_STATUS_VALUES,
            default: DecisionStatus.PENDING,
         },
         requestedBy: {
            type: String,
            enum: ["student", "tutor"],
         },
         requestedAt: { type: Date },
         reason: { type: String },
         adminReviewRequired: { type: Boolean, default: false },
         adminResolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
         adminResolvedAt: { type: Date },
         adminNotes: { type: String },
         _id: false,
      },
      // Complete pending: who proposed complete, confirmations timestamps, admin metadata
      complete_pending: {
         student: {
            type: String,
            enum: DECISION_STATUS_VALUES,
            default: DecisionStatus.PENDING,
         },
         tutor: {
            type: String,
            enum: DECISION_STATUS_VALUES,
            default: DecisionStatus.PENDING,
         },
         requestedBy: {
            type: String,
            enum: ["student", "tutor"],
         },
         requestedAt: { type: Date },
         reason: { type: String },
         studentConfirmedAt: { type: Date },
         tutorConfirmedAt: { type: Date },
         adminReviewRequired: { type: Boolean, default: false },
         adminResolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
         adminResolvedAt: { type: Date },
         adminNotes: { type: String },
         _id: false,
      },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "teaching_requests",
   }
);

TeachingRequestSchema.index({ studentId: 1, tutorId: 1, status: 1 });

export default mongoose.model<ITeachingRequest>(
   "TeachingRequest",
   TeachingRequestSchema
);
