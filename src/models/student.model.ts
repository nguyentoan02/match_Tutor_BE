import mongoose, { Schema } from "mongoose";
import { IStudent } from "../types/types/student";
import { getVietnamTime } from "../utils/date.util";
import { LEVEL_VALUES } from "../types/enums/level.enum";

const StudentSchema: Schema<IStudent> = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      subjectsInterested: [{ type: String }],
      // gradeLevel normalized by enum values
      gradeLevel: { type: String, enum: LEVEL_VALUES },
      bio: { type: String },
      learningGoals: { type: String },
      availabilityNote: { type: String },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "students",
   }
);

StudentSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model<IStudent>("Student", StudentSchema);
