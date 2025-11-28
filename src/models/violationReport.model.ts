import mongoose, { Schema } from "mongoose";
import { IViolationReport } from "../types/types/violationReport";
import { getVietnamTime } from "../utils/date.util";
import {
   VIOLATION_TYPE_VALUES,
   VIOLATION_STATUS_VALUES,
   ViolationStatusEnum,
} from "../types/enums/violationReport.enum";

const ViolationReportSchema: Schema<IViolationReport> = new Schema(
   {
      type: {
         type: String,
         enum: VIOLATION_TYPE_VALUES,
      },
      reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      reportedUserId: { type: Schema.Types.ObjectId, ref: "User" },
      relatedTeachingRequestId: { type: Schema.Types.ObjectId, ref: "TeachingRequest" },
      reason: { type: String },
      evidenceFiles: [{ type: String }],
      status: {
         type: String,
         enum: VIOLATION_STATUS_VALUES,
         default: ViolationStatusEnum.PENDING,
      },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "violation_reports",
   }
);

ViolationReportSchema.index({ relatedTeachingRequestId: 1, status: 1 });

export default mongoose.model<IViolationReport>(
   "ViolationReport",
   ViolationReportSchema
);
