import mongoose, { Schema } from "mongoose";
import { ISuggestionSchedules } from "../types/types/suggestionSchedules";

const SuggestionSchedulesSchema: Schema<ISuggestionSchedules> = new Schema(
   {
      tutorId: {
         type: Schema.Types.ObjectId,
         ref: "Tutor",
      },
      teachingRequestId: {
         type: Schema.Types.ObjectId,
         ref: "TeachingRequest",
      },
      schedules: [
         {
            start: Date,
            end: Date,
            _id: false,
         },
      ],
      title: String,
      proposedTotalPrice: { type: Number, required: true }, // Giá tổng đề xuất của gia sư

      // Trạng thái luồng đề xuất lịch giữa học sinh và gia sư
      status: {
         type: String,
         enum: ["PENDING", "REJECTED", "ACCEPTED"],
         default: "PENDING",
      },

      // Phản hồi của học sinh (khi từ chối / đồng ý)
      studentResponse: {
         status: {
            type: String,
            enum: ["PENDING", "REJECTED", "ACCEPTED"],
            default: "PENDING",
         },
         reason: { type: String },
         respondedAt: { type: Date },
         _id: false,
      },
   },
   {
      timestamps: true,
   }
);

SuggestionSchedulesSchema.index({ tutorId: 1 });
SuggestionSchedulesSchema.index({ teachingRequestId: 1 });

export default mongoose.model(
   "suggestionSchedules",
   SuggestionSchedulesSchema
);
