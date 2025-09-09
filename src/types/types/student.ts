import { Document, Types } from "mongoose";
import { Level } from "../enums/level.enum";
import { TimeSlot } from "../enums/timeSlot.enum";
import { Subject } from "../enums/subject.enum";

export interface IStudent extends Document {
   userId: Types.ObjectId;
   // use Subject enum for consistency
   subjectsInterested?: Subject[];
   // use Level enum (grade_1 .. grade_12, university)
   gradeLevel?: Level;
   bio?: string;
   learningGoals?: string;
   // availability grid (dayOfWeek + time slots), same shape as tutor availability
   availability?: {
      dayOfWeek: number;
      slots?: TimeSlot[];
   }[];
   createdAt?: Date;
   updatedAt?: Date;
}
