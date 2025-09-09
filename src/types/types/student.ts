import { Document, Types } from "mongoose";
import { Gender } from "../enums/gender.enum";
import { Level } from "../enums/level.enum";

export interface IStudent extends Document {
   userId: Types.ObjectId;
   subjectsInterested?: string[];
   // use Level enum (grade_1 .. grade_12, university)
   gradeLevel?: Level;
   bio?: string;
   learningGoals?: string;
   availabilityNote?: string;
   createdAt?: Date;
   updatedAt?: Date;
}
