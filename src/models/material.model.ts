import mongoose, { Schema } from "mongoose";
import { IMaterial } from "../types/types/material";
import { getVietnamTime } from "../utils/date.util";

const MaterialSchema: Schema<IMaterial> = new Schema(
   {
      sessionId: {
         type: Schema.Types.ObjectId,
         ref: "Session",
         required: true,
      },
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

MaterialSchema.index({ sessionId: 1 });

export default mongoose.model<IMaterial>("Material", MaterialSchema);
