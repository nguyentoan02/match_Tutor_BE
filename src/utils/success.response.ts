import { Response } from "express";
import { HTTP_STATUS, REASON_STATUS_CODE } from "./httpStatus";
/* 
    Tóm tắt mục đích:
        SuccessResponse: Lớp cơ bản cho tất cả các phản hồi thành công, cung cấp cấu trúc chung.
        ok: Phương thức tĩnh để gửi phản hồi thành công (vd: lấy danh sách người dùng, trả về dữ liệu).
        created: Phương thức tĩnh để gửi phản hồi thành công khi tạo tài nguyên mới (vd: tạo người dùng mới).
        accepted: Phương thức tĩnh để gửi phản hồi thành công khi yêu cầu được chấp nhận (vd: yêu cầu xử lý không đồng bộ).
        noContent: Phương thức tĩnh để gửi phản hồi không có nội dung (vd: xóa tài nguyên thành công).
    Khi nào sử dụng cái nào?
        Sử dụng lớp con (OK, CREATED):
        Khi bạn cần phản hồi chi tiết hoặc muốn thêm logic bổ sung.
        Ví dụ: Khi tạo tài nguyên mới và cần trả về thông tin chi tiết của tài nguyên.

        Sử dụng phương thức tĩnh (ok, created, accepted, noContent):
        Khi bạn chỉ cần gửi phản hồi đơn giản mà không cần tùy chỉnh.
        Ví dụ: Khi trả về danh sách người dùng hoặc thông báo xóa thành công.
        OK: Lớp con của SuccessResponse để gửi phản hồi thành công (vd: lấy thông tin chi tiết của một tài nguyên).
        CREATED: Lớp con của SuccessResponse để gửi phản hồi thành công khi tạo tài nguyên mới (vd: tạo tài nguyên với dữ liệu bổ sung).
*/

// Interface IApiResponse: Định nghĩa cấu trúc của một phản hồi thành công
interface IApiResponse<T = any> {
    status: string; // Trạng thái phản hồi (vd: "success")
    message: string; // Thông báo phản hồi (vd: "User created successfully")
    data?: T; // Dữ liệu trả về (vd: thông tin người dùng)
    code: number; // Mã trạng thái HTTP (vd: 200, 201)
}

// Class SuccessResponse: Lớp cơ bản cho tất cả các phản hồi thành công
export class SuccessResponse {
    public message: string; // Thông báo phản hồi
    public status: number; // Mã trạng thái HTTP
    public metadata: any; // Dữ liệu bổ sung (vd: thông tin người dùng)

    constructor({
        message, // Thông báo phản hồi
        statusCode = HTTP_STATUS.OK, // Mã trạng thái HTTP mặc định là 200
        reasonStatusCode = REASON_STATUS_CODE.OK, // Lý do mặc định là "Success"
        metadata = {}, // Dữ liệu bổ sung mặc định là rỗng
    }: {
        message?: string; // Thông báo phản hồi tùy chọn
        statusCode?: number; // Mã trạng thái HTTP tùy chọn
        reasonStatusCode?: string; // Lý do phản hồi tùy chọn
        metadata?: any; // Dữ liệu bổ sung tùy chọn
    }) {
        this.message = message || reasonStatusCode; // Nếu không có thông báo, sử dụng lý do mặc định
        this.status = statusCode; // Gán mã trạng thái HTTP
        this.metadata = metadata; // Gán dữ liệu bổ sung
    }

    // Phương thức send: Gửi phản hồi thành công đến client
    send(res: Response, headers: Record<string, string> = {}): Response {
        // Đặt các header tùy chỉnh nếu có
        Object.entries(headers).forEach(([key, value]) => {
            res.setHeader(key, value);
        });

        const response: IApiResponse = {
            status: "success", // Trạng thái phản hồi
            message: this.message, // Thông báo phản hồi
            code: this.status, // Mã trạng thái HTTP
            data: this.metadata, // Dữ liệu bổ sung
        };

        return res.status(this.status).json(response); // Trả về phản hồi dạng JSON
    }

    /**
     * Phương thức tĩnh ok: Gửi phản hồi thành công (200)
     */
    public static ok<T>(res: Response, data?: T, message?: string): Response {
        const response: IApiResponse<T> = {
            status: "success", // Trạng thái phản hồi
            message: message || REASON_STATUS_CODE.OK, // Thông báo phản hồi mặc định là "Success"
            code: HTTP_STATUS.OK, // Mã trạng thái HTTP là 200
            data, // Dữ liệu trả về
        };
        return res.status(HTTP_STATUS.OK).json(response); // Trả về phản hồi dạng JSON
    }

    /**
     * Phương thức tĩnh created: Gửi phản hồi thành công (201)
     */
    public static created<T>(
        res: Response,
        data?: T,
        message?: string
    ): Response {
        const response: IApiResponse<T> = {
            status: "success", // Trạng thái phản hồi
            message: message || REASON_STATUS_CODE.CREATED, // Thông báo phản hồi mặc định là "Created"
            code: HTTP_STATUS.CREATED, // Mã trạng thái HTTP là 201
            data, // Dữ liệu trả về
        };
        return res.status(HTTP_STATUS.CREATED).json(response); // Trả về phản hồi dạng JSON
    }

    /**
     * Phương thức tĩnh accepted: Gửi phản hồi thành công (202)
     */
    public static accepted<T>(
        res: Response,
        data?: T,
        message?: string
    ): Response {
        const response: IApiResponse<T> = {
            status: "success", // Trạng thái phản hồi
            message: message || REASON_STATUS_CODE.ACCEPTED, // Thông báo phản hồi mặc định là "Accepted"
            code: HTTP_STATUS.ACCEPTED, // Mã trạng thái HTTP là 202
            data, // Dữ liệu trả về
        };
        return res.status(HTTP_STATUS.ACCEPTED).json(response); // Trả về phản hồi dạng JSON
    }

    /**
     * Phương thức tĩnh noContent: Gửi phản hồi không có nội dung (204)
     */
    public static noContent(res: Response): Response {
        return res.status(HTTP_STATUS.NO_CONTENT).send(); // Trả về phản hồi không có nội dung
    }
}

// Class OK: Phản hồi thành công (200)
export class OK extends SuccessResponse {
    constructor({ message, metadata }: { message?: string; metadata?: any }) {
        super({
            message, // Thông báo phản hồi
            statusCode: HTTP_STATUS.OK, // Mã trạng thái HTTP là 200
            reasonStatusCode: REASON_STATUS_CODE.OK, // Lý do phản hồi là "Success"
            metadata, // Dữ liệu bổ sung
        });
    }
}

// Class CREATED: Phản hồi thành công (201)
export class CREATED extends SuccessResponse {
    public options: any; // Tùy chọn bổ sung

    constructor({
        message, // Thông báo phản hồi
        metadata, // Dữ liệu bổ sung
        options = {}, // Tùy chọn bổ sung mặc định là rỗng
    }: {
        message?: string; // Thông báo phản hồi tùy chọn
        metadata?: any; // Dữ liệu bổ sung tùy chọn
        options?: any; // Tùy chọn bổ sung tùy chọn
    }) {
        super({
            message, // Thông báo phản hồi
            statusCode: HTTP_STATUS.CREATED, // Mã trạng thái HTTP là 201
            reasonStatusCode: REASON_STATUS_CODE.CREATED, // Lý do phản hồi là "Created"
            metadata, // Dữ liệu bổ sung
        });
        this.options = options; // Gán tùy chọn bổ sung
    }
}
