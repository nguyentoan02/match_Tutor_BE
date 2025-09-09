import mongoose, { Schema } from "mongoose";
import { IStudent } from "../types/types/student";
import { getVietnamTime } from "../utils/date.util";
import { LEVEL_VALUES } from "../types/enums/level.enum";
import { SUBJECT_VALUES } from "../types/enums/subject.enum";
import { TIME_SLOT_VALUES } from "../types/enums/timeSlot.enum";

const StudentSchema: Schema<IStudent> = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      // subjects: enum of allowed subject labels
      subjectsInterested: { type: [String], enum: SUBJECT_VALUES, default: [] },
      // gradeLevel normalized by enum values
      gradeLevel: { type: String, enum: LEVEL_VALUES },
      bio: { type: String },
      learningGoals: { type: String },
      // availability grid (dayOfWeek + slots) like Tutor
      availability: [
         {
            dayOfWeek: { type: Number, min: 0, max: 7 },
            slots: [{ type: String, enum: TIME_SLOT_VALUES, default: [] }],
            _id: false,
         },
      ],
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
