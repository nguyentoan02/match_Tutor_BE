import { Document, Types } from "mongoose";
import { TeachingRequestStatus } from "../enums/teachingRequest.enum";
import { Subject } from "../enums/subject.enum";
import { Level } from "../enums/level.enum";

export interface ITeachingRequest extends Document {
   studentId: Types.ObjectId;
   tutorId?: Types.ObjectId;
   subject: Subject;
   level: Level;
   hourlyRate: number;
   description?: string;

   status?: TeachingRequestStatus | string;
   createdBy?: Types.ObjectId;
   createdAt?: Date;
   updatedAt?: Date;
}
