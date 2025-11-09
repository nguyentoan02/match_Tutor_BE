export enum TeachingRequestStatus {
   PENDING = "PENDING", // Chờ gia sư phản hồi
   ACCEPTED = "ACCEPTED", // Gia sư đã chấp nhận
   REJECTED = "REJECTED", // Gia sư từ chối
}

export const TEACHING_REQUEST_STATUS_VALUES = Object.values(
   TeachingRequestStatus
);
