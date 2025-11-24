export enum ViolationTypeEnum {
   SCAM_TUTOR = "SCAM_TUTOR",
   OTHER = "OTHER",
}

export const VIOLATION_TYPE_VALUES = Object.values(
   ViolationTypeEnum
) as ViolationTypeEnum[];

export enum ViolationStatusEnum {
   PENDING = "PENDING",
   RESOLVED = "RESOLVED",
   REJECTED = "REJECTED",
}

export const VIOLATION_STATUS_VALUES = Object.values(
   ViolationStatusEnum
) as ViolationStatusEnum[];
