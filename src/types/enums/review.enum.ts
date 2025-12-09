export enum ReviewTypeEnum {
   SESSION = "SESSION",
   OVERALL = "OVERALL",
}

export const REVIEW_TYPE_VALUES = Object.values(
   ReviewTypeEnum
) as ReviewTypeEnum[];

export enum ReviewVisibilityRequestStatusEnum {
   NONE = "NONE",
   PENDING = "PENDING",
   APPROVED = "APPROVED",
   REJECTED = "REJECTED",
}

export const REVIEW_VISIBILITY_REQUEST_STATUS_VALUES = Object.values(
   ReviewVisibilityRequestStatusEnum
) as ReviewVisibilityRequestStatusEnum[];