import { Document, Types } from "mongoose";
import {
   DecisionStatus,
   TeachingRequestStatus,
} from "../enums/teachingRequest.enum";
import { Subject } from "../enums/subject.enum";
import { Level } from "../enums/level.enum";

export interface ITrialDecision {
   student: DecisionStatus | string;
   tutor: DecisionStatus | string;
}

export interface ICompletePending {
   // current decisions
   student: DecisionStatus | string;
   tutor: DecisionStatus | string;

   // who originally proposed to complete the course: "student" | "tutor"
   requestedBy?: "student" | "tutor";

   // when the completion was proposed
   requestedAt?: Date;

   // optional short reason provided by the proposer
   reason?: string;

   // timestamps when each party confirmed (useful for audit / UI)
   studentConfirmedAt?: Date;
   tutorConfirmedAt?: Date;

   // mark if escalation to admin is required (when one party disputes)
   adminReviewRequired?: boolean;

   // admin resolution metadata (if admin handles the dispute)
   adminResolvedBy?: Types.ObjectId; // admin user id
   adminResolvedAt?: Date;
   adminNotes?: string;
}

export interface ICancellationDecision {
   student: DecisionStatus | string;
   tutor: DecisionStatus | string;
   requestedBy?: "student" | "tutor";
   requestedAt?: Date;
   reason?: string;
   adminReviewRequired?: boolean; // Đánh dấu khi cần Admin can thiệp
   adminResolvedBy?: Types.ObjectId; // Admin nào đã xử lý
   adminResolvedAt?: Date; // Thời gian Admin xử lý
   adminNotes?: string; // Ghi chú của Admin
}

export interface ITeachingRequest extends Document {
   studentId: Types.ObjectId;
   tutorId?: Types.ObjectId;
   subject: Subject;
   level: Level;
   hourlyRate: number;
   description?: string;
   totalSessionsPlanned?: number;
   trialSessionsCompleted?: number; // Đảm bảo trường này tồn tại
   trialDecision?: ITrialDecision;
   status?: TeachingRequestStatus | string;
   complete_pending?: ICompletePending;
   cancellationDecision?: ICancellationDecision;
   createdBy?: Types.ObjectId;
   createdAt?: Date;
   updatedAt?: Date;
}
