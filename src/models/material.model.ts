import mongoose, { Schema } from "mongoose";
import { IMaterial } from "../types/types/material";
import { getVietnamTime } from "../utils/date.util";

const MaterialSchema: Schema<IMaterial> = new Schema(
   {
      title: { type: String, required: true },
      description: { type: String },
      fileUrl: { type: String },
      uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
      uploadedAt: { type: Date, default: getVietnamTime },
   },
   {
      collection: "materials",
   }
);

export default mongoose.model<IMaterial>("Material", MaterialSchema);
