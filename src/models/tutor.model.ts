import mongoose, { Schema } from "mongoose";
import { ITutor } from "../types/types/tutor";
import { getVietnamTime } from "../utils/date.util";
import { TIME_SLOT_VALUES } from "../types/enums/timeSlot.enum";
import { CLASS_TYPE_VALUES } from "../types/enums/classType.enum";
import { LEVEL_VALUES } from "../types/enums/level.enum";
import { SUBJECT_VALUES } from "../types/enums/subject.enum";
import { ClassType } from "../types/enums/classType.enum";

const TutorSchema: Schema<ITutor> = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      // subjects: enum of allowed subject labels (keeps data consistent)
      subjects: { type: [String], enum: SUBJECT_VALUES, default: [] },
      // standardized levels (enum) to avoid inconsistent strings
      levels: { type: [String], enum: LEVEL_VALUES, default: [] },
      // store muliple education entries (institution, degree, field, years, note)
      education: [
         {
            institution: { type: String },
            degree: { type: String },
            fieldOfStudy: { type: String },
            // store full dates for study period
            startDate: { type: Date },
            endDate: { type: Date },
            // short description and extra notes
            description: { type: String },
            notes: { type: String },
            // multiple image links for certificates/transcripts
            imageUrls: [{ type: String }],
            _id: false,
         },
      ],
      //ten, mo ta voi anh, de t them
      certifications: [
         {
            name: { type: String },
            description: { type: String },
            imageUrls: [{ type: String }],
            _id: false,
         },
      ],
      experienceYears: { type: Number, min: 0 },
      hourlyRate: { type: Number, min: 0 },
      bio: { type: String },
      // teaching mode shown on tutor profile (default online)
      classType: [{ type: String, enum: CLASS_TYPE_VALUES, required: true }],
      availability: [
         {
            dayOfWeek: { type: Number, min: 0, max: 7 },
            slots: [{ type: String, enum: TIME_SLOT_VALUES, default: [] }],
            _id: false,
         },
      ],
      isApproved: { type: Boolean, default: false },
      ratings: {
         average: { type: Number, default: 0 },
         totalReviews: { type: Number, default: 0 },
         _id: false,
      },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "tutors",
   }
);

export default mongoose.model<ITutor>("Tutor", TutorSchema);
