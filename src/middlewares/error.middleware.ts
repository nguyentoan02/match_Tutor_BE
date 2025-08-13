import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/error.response";
import { HTTP_STATUS } from "../utils/httpStatus";

/* 
    Tóm tắt mục đích:
        errorHandler: Middleware xử lý lỗi toàn cục trong ứng dụng.
        - Bắt tất cả các lỗi xảy ra trong ứng dụng (bao gồm lỗi từ controller, service, hoặc các lỗi không mong muốn).
        - Format lỗi nhất quán để trả về cho client.
        - Xử lý các lỗi đặc biệt như:
            + CastError: ID không hợp lệ (vd: ObjectId không đúng định dạng).
            + Duplicate Key Error: Trùng lặp giá trị unique (vd: email đã tồn tại).
            + Validation Error: Dữ liệu không hợp lệ (vd: thiếu trường bắt buộc).
        - Log lỗi để hỗ trợ debug trong môi trường phát triển.
        - Đảm bảo ứng dụng không bị crash khi gặp lỗi.
*/

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let error = { ...err };
    error.message = err.message;

    // Log lỗi ra console để hỗ trợ debug
    console.error(err);

    // Nếu lỗi không phải là instance của AppError, xử lý các lỗi đặc biệt
    if (!(error instanceof AppError)) {
        // Xử lý lỗi CastError (ID không hợp lệ)
        if (err.name === "CastError") {
            const message = "Resource not found";
            error = new AppError(message, HTTP_STATUS.NOT_FOUND);
        }
        // Xử lý lỗi Duplicate Key Error (Trùng lặp giá trị unique)
        else if (err.code === 11000) {
            const message = "Duplicate field value entered";
            error = new AppError(message, HTTP_STATUS.CONFLICT);
        }
        // Xử lý lỗi Validation Error (Dữ liệu không hợp lệ)
        else if (err.name === "ValidationError") {
            const message = Object.values(err.errors)
                .map((val: any) => val.message)
                .join(", ");
            error = new AppError(message, HTTP_STATUS.BAD_REQUEST);
        }
        // Xử lý lỗi chung (Generic Error)
        else {
            error = new AppError(
                err.message || "Internal Server Error",
                HTTP_STATUS.INTERNAL_SERVER
            );
        }
    }

    // Trả về phản hồi lỗi cho client
    res.status(error.statusCode || HTTP_STATUS.INTERNAL_SERVER).json({
        success: false,
        status: error.status || "error",
        message: error.message,
        code: error.statusCode || HTTP_STATUS.INTERNAL_SERVER,
        ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
    });
};
