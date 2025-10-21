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

// Base decision schema cho reuse
const baseDecisionSchema = {
   student: {
      decision: {
         type: String,
         enum: DECISION_STATUS_VALUES,
         default: DecisionStatus.PENDING,
      },
      reason: { type: String },
   },
   tutor: {
      decision: {
         type: String,
         enum: DECISION_STATUS_VALUES,
         default: DecisionStatus.PENDING,
      },
      reason: { type: String },
   },
   requestedBy: {
      type: String,
      enum: ["student", "tutor"],
   },
   requestedAt: { type: Date },
   // The 'reason' field is now part of the student/tutor objects.
   // The top-level reason can be considered the initiator's reason.
   reason: { type: String },
   adminReviewRequired: { type: Boolean, default: false },
   adminResolvedBy: { type: Schema.Types.ObjectId, ref: "User" },
   adminResolvedAt: { type: Date },
   adminNotes: { type: String },
};

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
      trialSessionsCompleted: { type: Number, default: 0, min: 0 },
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
         ...baseDecisionSchema,
         _id: false,
      },
      // Complete pending: who proposed complete, confirmations timestamps, admin metadata
      complete_pending: {
         ...baseDecisionSchema,
         studentConfirmedAt: { type: Date },
         tutorConfirmedAt: { type: Date },
         _id: false,
      },

      // NEW: History arrays for admin reviews
      cancellationDecisionHistory: [
         {
            ...baseDecisionSchema,
            resolvedDate: { type: Date, default: getVietnamTime },
            _id: false,
         },
      ],
      complete_pendingHistory: [
         {
            ...baseDecisionSchema,
            studentConfirmedAt: { type: Date },
            tutorConfirmedAt: { type: Date },
            resolvedDate: { type: Date, default: getVietnamTime },
            _id: false,
         },
      ],

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
