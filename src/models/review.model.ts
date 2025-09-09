import mongoose, { Schema } from "mongoose";
import { IReview } from "../types/types/review";
import { getVietnamTime } from "../utils/date.util";
import { REVIEW_TYPE_VALUES, ReviewTypeEnum } from "../types/enums/review.enum";

const ReviewSchema: Schema<IReview> = new Schema(
   {
      type: {
         type: String,
         enum: REVIEW_TYPE_VALUES,
         default: ReviewTypeEnum.SESSION,
      },
      sessionId: { type: Schema.Types.ObjectId, ref: "Session" },
      teachingRequestId: {
         type: Schema.Types.ObjectId,
         ref: "TeachingRequest",
      },
      reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      revieweeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      rating: { type: Number, required: true, min: 1, max: 5 },
      comment: { type: String },
      isVisible: { type: Boolean, default: true },
   },
   {
      timestamps: {
         createdAt: true,
         updatedAt: false,
         currentTime: getVietnamTime,
      },
      collection: "reviews",
   }
);

ReviewSchema.index({ teachingRequestId: 1 });
ReviewSchema.index({ sessionId: 1 });
ReviewSchema.index({ reviewerId: 1, revieweeId: 1 });

export default mongoose.model<IReview>("Review", ReviewSchema);
