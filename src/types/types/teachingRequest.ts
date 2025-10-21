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
   // current decisions + individual reasons
   student: { decision: DecisionStatus | string; reason?: string };
   tutor: { decision: DecisionStatus | string; reason?: string };

   // who originally proposed to complete the course
   requestedBy?: "student" | "tutor";
   // when the completion was proposed
   requestedAt?: Date;
   // initiator’s reason
   reason?: string;

   // timestamps when each party confirmed (for audit/UI)
   studentConfirmedAt?: Date;
   tutorConfirmedAt?: Date;

   // escalation to admin
   adminReviewRequired?: boolean;
   // admin resolution
   adminResolvedBy?: Types.ObjectId;
   adminResolvedAt?: Date;
   adminNotes?: string;
}

export interface ICancellationDecision {
   // decisions + individual reasons
   student: { decision: DecisionStatus | string; reason?: string };
   tutor: { decision: DecisionStatus | string; reason?: string };

   requestedBy?: "student" | "tutor";
   requestedAt?: Date;
   // initiator’s reason
   reason?: string;

   adminReviewRequired?: boolean;
   adminResolvedBy?: Types.ObjectId;
   adminResolvedAt?: Date;
   adminNotes?: string;
}

// NEW: History interfaces for admin reviews
export interface ICancellationDecisionHistory extends ICancellationDecision {
   resolvedDate?: Date; // Thời gian lưu vào history
}

export interface ICompletePendingHistory extends ICompletePending {
   resolvedDate?: Date; // Thời gian lưu vào history
}

export interface ITeachingRequest extends Document {
   studentId: Types.ObjectId;
   tutorId?: Types.ObjectId;
   subject: Subject;
   level: Level;
   hourlyRate: number;
   description?: string;
   totalSessionsPlanned?: number;
   trialSessionsCompleted?: number;
   trialDecision?: ITrialDecision;
   status?: TeachingRequestStatus | string;
   complete_pending?: ICompletePending;
   cancellationDecision?: ICancellationDecision;

   // NEW: History arrays
   cancellationDecisionHistory?: ICancellationDecisionHistory[];
   complete_pendingHistory?: ICompletePendingHistory[];

   createdBy?: Types.ObjectId;
   createdAt?: Date;
   updatedAt?: Date;
}
