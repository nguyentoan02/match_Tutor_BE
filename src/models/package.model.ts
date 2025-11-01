import mongoose, { Schema } from "mongoose";
import { IPackage } from "../types/types/package";
import { getVietnamTime } from "../utils/date.util";

const PackageSchema: Schema<IPackage> = new Schema(
   {
      name: { type: String, required: true },
      description: { type: [String], default: [] },
      price: { type: Number, required: true, min: 0 },
      features: {
         boostVisibility: { type: Boolean, default: false },
         priorityRanking: { type: Boolean, default: false },
         featuredProfile: { type: Boolean, default: false },
         // Usage caps within features
         maxStudents: { type: Number, default: 0 },
         maxQuiz: { type: Number, default: 0 },
      },
      isActive: { type: Boolean, default: true },
      popular: { type: Boolean, default: false },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "packages",
   }
);

export default mongoose.model<IPackage>("Package", PackageSchema);
