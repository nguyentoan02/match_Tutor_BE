import mongoose, { Schema } from "mongoose";
import { ITeachingRequest } from "../types/types/teachingRequest";
import { TEACHING_REQUEST_STATUS_VALUES } from "../types/enums/teachingRequest.enum";
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

      status: {
         type: String,
         enum: TEACHING_REQUEST_STATUS_VALUES,
         default: "PENDING",
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
