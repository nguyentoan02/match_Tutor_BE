export enum CancellationStatus {
   PENDING = "PENDING",
   ACCEPTED = "ACCEPTED",
   REJECTED = "REJECTED",
}

export const CANCELLATION_STATUS_VALUES = Object.values(CancellationStatus);
