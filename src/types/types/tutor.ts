import { Document, Types } from "mongoose";
import { IRating } from "./common";
import { TimeSlot } from "../enums/timeSlot.enum";
import { ClassType } from "../enums/classType.enum";
import { Level } from "../enums/level.enum";
import { Subject } from "../enums/subject.enum";

export interface IEducation {
   institution?: string;
   degree?: string; // e.g. "B.Sc.", "M.A.", "High School"
   fieldOfStudy?: string; // ngành học
   startYear?: number;
   endYear?: number;
   description?: string; // ghi chú thêm (học bổng, xếp loại...)
}

export interface ITutor extends Document {
   userId: Types.ObjectId;
   subjects?: Subject[]; // use Subject enum for consistency
   // standardized teaching levels (Grade 1..12, University)
   levels?: Level[];
   education?: IEducation[];
   certifications?: string[];
   experienceYears?: number;
   hourlyRate?: number;
   bio?: string;
   availability?: {
      dayOfWeek: number;
      slots?: TimeSlot[];
   }[];
   // classType indicates teaching mode shown in UI (online / in_person)
   classType?: ClassType | string;
   isApproved?: boolean;
   ratings?: IRating;
   createdAt?: Date;
   updatedAt?: Date;
}
