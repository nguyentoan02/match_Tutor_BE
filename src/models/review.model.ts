import mongoose, { Schema } from "mongoose";
import { IReview } from "../types/types/review";
import { getVietnamTime } from "../utils/date.util";
import { REVIEW_TYPE_VALUES, ReviewTypeEnum } from "../types/enums/review.enum";

const ReviewSchema: Schema<IReview> = new Schema(
   {
      // Loại review: SESSION cho đánh giá buổi học riêng, OVERALL cho đánh giá tổng khóa học
      type: {
         type: String,
         enum: REVIEW_TYPE_VALUES,
         default: ReviewTypeEnum.OVERALL,
      },
      // --- COMMENTED OUT: trường chỉ dùng cho type === 'SESSION'
      // sessionId: { type: Schema.Types.ObjectId, ref: "Session" },

      // Dùng cho review tổng (OVERALL): xác định khóa học cần đánh giá
      teachingRequestId: {
         type: Schema.Types.ObjectId,
         ref: "TeachingRequest",
      },
      // Người review (học sinh)
      reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      // Người được review (gia sư)
      revieweeId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      // Điểm đánh giá (1–5), dùng cho cả SESSION và OVERALL
      rating: { type: Number, required: true, min: 1, max: 5 },
      // Nội dung nhận xét, thường dùng cho OVERALL
      comment: { type: String },
      // Ẩn/hiện review
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

// Index để tìm nhanh theo khóa học hoặc buổi học
ReviewSchema.index({ teachingRequestId: 1 });
// ReviewSchema.index({ sessionId: 1 }); // commented out — chỉ dùng cho SESSION reviews
ReviewSchema.index({ reviewerId: 1, revieweeId: 1 });
ReviewSchema.index({ revieweeId: 1 }); // Thêm index này để truy vấn review của một người nhanh hơn

export default mongoose.model<IReview>("Review", ReviewSchema);
