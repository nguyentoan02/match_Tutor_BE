import { Document, Types } from "mongoose";
import {
   DecisionStatus,
   TeachingRequestStatus,
} from "../enums/teachingRequest.enum";

export interface ITrialDecision {
   student: DecisionStatus | string;
   tutor: DecisionStatus | string;
}

export interface ICompletePending {
   student: DecisionStatus | string;
   tutor: DecisionStatus | string;
}

export interface ITeachingRequest extends Document {
   studentId: Types.ObjectId;
   tutorId?: Types.ObjectId;
   subject: string;
   level: string;
   description?: string;
   totalSessionsPlanned?: number;
   trialDecision?: ITrialDecision;
   status?: TeachingRequestStatus | string;
   complete_pending?: ICompletePending;
   createdBy?: Types.ObjectId;
   createdAt?: Date;
   updatedAt?: Date;
}
