import { Document, Types } from "mongoose";
import {
   ReviewTypeEnum,
   ReviewVisibilityRequestStatusEnum
} from "../enums/review.enum";

export type ReviewType = ReviewTypeEnum;

export interface IReview extends Document {
   type?: ReviewTypeEnum;
   sessionId?: Types.ObjectId;
   teachingRequestId?: Types.ObjectId;
   reviewerId: Types.ObjectId;
   revieweeId: Types.ObjectId;
   rating: number;
   comment?: string;
   createdAt?: Date;
   isVisible?: boolean;
    visibilityRequestStatus?: ReviewVisibilityRequestStatusEnum;
    visibilityRequestReason?: string;
    visibilityRequestAdminNote?: string;
    visibilityReviewedAt?: Date;
    visibilityReviewedBy?: Types.ObjectId;
}
