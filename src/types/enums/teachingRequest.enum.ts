export enum TeachingRequestStatus {
   PENDING = "PENDING", // Chờ gia sư phản hồi
   REJECTED = "REJECTED", // Gia sư từ chối
   TRIAL_ACCEPTED = "TRIAL_ACCEPTED", // Gia sư chấp nhận, chuẩn bị xếp lịch
   TRIAL_SCHEDULED = "TRIAL_SCHEDULED", // Đã có lịch học thử cụ thể
   TRIAL_COMPLETED = "TRIAL_COMPLETED", // Hoàn thành học thử, chờ quyết định
   IN_PROGRESS = "IN_PROGRESS", // Đang học chính thức
   CANCELLATION_PENDING = "CANCELLATION_PENDING", // Có yêu cầu hủy, chờ xác nhận
   COMPLETE_PENDING = "COMPLETE_PENDING", // Có yêu cầu hoàn thành, chờ xác nhận
   COMPLETED = "COMPLETED", // Hoàn thành khóa học
   CANCELLED = "CANCELLED", // Đã hủy
   ADMIN_REVIEW = "ADMIN_REVIEW", // Admin đang xử lý tranh chấp (tùy chọn)
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
