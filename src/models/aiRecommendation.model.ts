import mongoose, { Schema } from "mongoose";
import { IAIRecommendation } from "../types/types/aiRecommendation";
import { getVietnamTime } from "../utils/date.util";

const AIRecommendationSchema: Schema<IAIRecommendation> = new Schema(
   {
      studentId: {
         type: Schema.Types.ObjectId,
         ref: "Student",
         required: true,
      },
      recommendedTutors: [
         {
            tutorId: { type: Schema.Types.ObjectId, ref: "Tutor" },
            score: { type: Number },
            reason: { type: String },
            _id: false,
         },
      ],
      generatedAt: { type: Date, default: getVietnamTime },
   },
   {
      collection: "ai_recommendations",
   }
);

AIRecommendationSchema.index({ studentId: 1 });

export default mongoose.model<IAIRecommendation>(
   "AIRecommendation",
   AIRecommendationSchema
);
