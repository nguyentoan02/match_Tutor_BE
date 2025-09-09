export enum SessionStatus {
   SCHEDULED = "SCHEDULED",
   CONFIRMED = "CONFIRMED",
   REJECTED = "REJECTED",
   COMPLETED = "COMPLETED",
   NOT_CONDUCTED = "NOT_CONDUCTED",
}

export const SESSION_STATUS_VALUES = Object.values(SessionStatus);
