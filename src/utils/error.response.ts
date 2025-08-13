import { HTTP_STATUS, REASON_STATUS_CODE } from "./httpStatus";
/* 
    Tóm tắt mục đích:
        AppError: Lớp cơ bản cho tất cả các lỗi, cung cấp cấu trúc chung.
        BadRequestError: Lỗi yêu cầu không hợp lệ (vd: thiếu dữ liệu).
        UnauthorizedError: Lỗi không được phép (vd: chưa đăng nhập).
        PaymentRequiredError: Lỗi yêu cầu thanh toán.
        ForbiddenError: Lỗi bị cấm (vd: không có quyền truy cập).
        NotFoundError: Lỗi không tìm thấy tài nguyên (vd: ID không tồn tại).
        ConflictError: Lỗi xung đột (vd: email đã tồn tại).
        PayloadTooLargeError: Lỗi payload quá lớn (vd: file upload vượt giới hạn).
        InternalServerError: Lỗi máy chủ nội bộ (vd: lỗi không xác định).
        ServiceUnavailableError: Lỗi dịch vụ không khả dụng (vd: server quá tải).
*/
// Interface IAppError: Định nghĩa cấu trúc của một lỗi ứng dụng
interface IAppError {
    statusCode: number; // Mã trạng thái HTTP (vd: 404, 500)
    status: string; // Trạng thái lỗi (vd: "fail", "error")
    isOperational: boolean; // Xác định lỗi có phải lỗi vận hành hay không
    message: string; // Thông báo lỗi
    stack?: string; // Stack trace của lỗi (chỉ hiển thị trong môi trường phát triển)
}

// Class AppError: Lớp cơ bản cho tất cả các lỗi ứng dụng
export class AppError extends Error implements IAppError {
    public statusCode: number; // Mã trạng thái HTTP
    public isOperational: boolean; // Xác định lỗi có phải lỗi vận hành hay không
    public status: string; // Trạng thái lỗi ("fail" cho lỗi client, "error" cho lỗi server)

    constructor(
        message: string, // Thông báo lỗi
        statusCode: number = HTTP_STATUS.INTERNAL_SERVER // Mã trạng thái HTTP mặc định là 500
    ) {
        super(message);

        this.statusCode = statusCode;
        this.isOperational = true; // Mặc định lỗi là lỗi vận hành
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error"; // Xác định trạng thái dựa trên mã HTTP

        Error.captureStackTrace(this, this.constructor); // Lưu stack trace của lỗi
    }
}

// Class BadRequestError: Lỗi yêu cầu không hợp lệ (400)
export class BadRequestError extends AppError {
    constructor(message: string = REASON_STATUS_CODE.BAD_REQUEST) {
        super(message, HTTP_STATUS.BAD_REQUEST); // Gửi mã trạng thái 400
        this.name = "BadRequestError"; // Tên lỗi
    }
}

// Class UnauthorizedError: Lỗi không được phép (401)
export class UnauthorizedError extends AppError {
    constructor(message: string = REASON_STATUS_CODE.UNAUTHORIZED) {
        super(message, HTTP_STATUS.UNAUTHORIZED); // Gửi mã trạng thái 401
        this.name = "UnauthorizedError"; // Tên lỗi
    }
}

// Class PaymentRequiredError: Lỗi yêu cầu thanh toán (402)
export class PaymentRequiredError extends AppError {
    constructor(message: string = REASON_STATUS_CODE.PAYMENT_REQUIRED) {
        super(message, HTTP_STATUS.PAYMENT_REQUIRED); // Gửi mã trạng thái 402
        this.name = "PaymentRequiredError"; // Tên lỗi
    }
}

// Class ForbiddenError: Lỗi bị cấm (403)
export class ForbiddenError extends AppError {
    constructor(message: string = REASON_STATUS_CODE.FORBIDDEN) {
        super(message, HTTP_STATUS.FORBIDDEN); // Gửi mã trạng thái 403
        this.name = "ForbiddenError"; // Tên lỗi
    }
}

// Class NotFoundError: Lỗi không tìm thấy tài nguyên (404)
export class NotFoundError extends AppError {
    constructor(message: string = REASON_STATUS_CODE.NOT_FOUND) {
        super(message, HTTP_STATUS.NOT_FOUND); // Gửi mã trạng thái 404
        this.name = "NotFoundError"; // Tên lỗi
    }
}

// Class ConflictError: Lỗi xung đột (409)
export class ConflictError extends AppError {
    constructor(message: string = REASON_STATUS_CODE.CONFLICT) {
        super(message, HTTP_STATUS.CONFLICT); // Gửi mã trạng thái 409
        this.name = "ConflictError"; // Tên lỗi
    }
}

// Class PayloadTooLargeError: Lỗi payload quá lớn (413)
export class PayloadTooLargeError extends AppError {
    constructor(message: string = REASON_STATUS_CODE.PAYLOAD_TOO_LARGE) {
        super(message, HTTP_STATUS.PAYLOAD_TOO_LARGE); // Gửi mã trạng thái 413
        this.name = "PayloadTooLargeError"; // Tên lỗi
    }
}

// Class InternalServerError: Lỗi máy chủ nội bộ (500)
export class InternalServerError extends AppError {
    constructor(message: string = REASON_STATUS_CODE.INTERNAL_SERVER) {
        super(message, HTTP_STATUS.INTERNAL_SERVER); // Gửi mã trạng thái 500
        this.name = "InternalServerError"; // Tên lỗi
    }
}

// Class ServiceUnavailableError: Lỗi dịch vụ không khả dụng (503)
export class ServiceUnavailableError extends AppError {
    constructor(message: string = REASON_STATUS_CODE.SERVICE_UNAVAILABLE) {
        super(message, HTTP_STATUS.SERVICE_UNAVAILABLE); // Gửi mã trạng thái 503
        this.name = "ServiceUnavailableError"; // Tên lỗi
    }
}
