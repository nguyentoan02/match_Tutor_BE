import mongoose, { Schema } from "mongoose";
import { ITeachingRequest } from "../types/types/teachingRequest";
import {
   TEACHING_REQUEST_STATUS_VALUES,
   DECISION_STATUS_VALUES,
   TeachingRequestStatus,
   DecisionStatus,
} from "../types/enums/teachingRequest.enum";
import { getVietnamTime } from "../utils/date.util";

const TeachingRequestSchema: Schema<ITeachingRequest> = new Schema(
   {
      studentId: {
         type: Schema.Types.ObjectId,
         ref: "Student",
         required: true,
      },
      tutorId: { type: Schema.Types.ObjectId, ref: "Tutor" },
      subject: { type: String, required: true },
      level: { type: String, required: true },
      description: { type: String },
      totalSessionsPlanned: { type: Number, min: 0 },
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
