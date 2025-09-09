import mongoose, { Schema } from "mongoose";
import { IPackage } from "../types/types/package";
import { getVietnamTime } from "../utils/date.util";

const PackageSchema: Schema<IPackage> = new Schema(
   {
      name: { type: String, required: true },
      description: { type: String },
      price: { type: Number, required: true },
      durationWeeks: { type: Number },
      sessionsIncluded: { type: Number },
      isActive: { type: Boolean, default: true },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "packages",
   }
);

export default mongoose.model<IPackage>("Package", PackageSchema);
