import mongoose, { Schema } from "mongoose";
import { IMaterial } from "../types/types/material";
import { getVietnamTime } from "../utils/date.util";
import { SUBJECT_VALUES } from "../types/enums/subject.enum";
import { LEVEL_VALUES } from "../types/enums/level.enum";

const MaterialSchema: Schema<IMaterial> = new Schema(
   {
      title: { type: String, required: true },
      description: { type: String },
      fileUrl: { type: String },
      // optional subject/level associated to tutor's allowed values
      subject: { type: String, enum: SUBJECT_VALUES, required: false },
      level: { type: String, enum: LEVEL_VALUES, required: false },
      uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
      uploadedAt: { type: Date, default: getVietnamTime },
   },
   {
      collection: "materials",
   }
);

export default mongoose.model<IMaterial>("Material", MaterialSchema);
