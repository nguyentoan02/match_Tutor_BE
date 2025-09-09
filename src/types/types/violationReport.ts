import { Document, Types } from "mongoose";
import {
   ViolationTypeEnum,
   ViolationStatusEnum,
} from "../enums/violationReport.enum";

export interface IViolationReport extends Document {
   type?: ViolationType;
   reporterId: Types.ObjectId;
   reportedUserId?: Types.ObjectId;
   relatedReviewId?: Types.ObjectId;
   relatedTeachingRequestId?: Types.ObjectId;
   reason?: string;
   evidenceFiles?: string[];
   status?: ViolationStatus;
   createdAt?: Date;
   updatedAt?: Date;
}
