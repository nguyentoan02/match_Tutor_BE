export enum TeachingRequestStatus {
   PENDING = "PENDING",
   TRIAL_PENDING = "TRIAL_PENDING",
   TRIAL_IN_PROGRESS = "TRIAL_IN_PROGRESS",
   IN_PROGRESS = "IN_PROGRESS",
   COMPLETE_PENDING = "COMPLETE_PENDING",
   COMPLETED = "COMPLETED",
   CANCELLED = "CANCELLED",
}

export enum DecisionStatus {
   PENDING = "PENDING",
   ACCEPTED = "ACCEPTED",
   REJECTED = "REJECTED",
}

export const TEACHING_REQUEST_STATUS_VALUES = Object.values(
   TeachingRequestStatus
);
export const DECISION_STATUS_VALUES = Object.values(DecisionStatus);
