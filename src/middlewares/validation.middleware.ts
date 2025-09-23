import { Request, Response, NextFunction } from "express";
import { ZodType, ZodError } from "zod";
import { BadRequestError } from "../utils/error.response";

/* 
    Tóm tắt mục đích:
        validate: Middleware để validate dữ liệu đầu vào sử dụng Zod schema.
        - Validate body, params, query, headers của request.
        - Tự động parse và transform dữ liệu (vd: trim, toLowerCase).
        - Trả về lỗi chi tiết nếu validation thất bại.
        - Gán dữ liệu đã validate vào request để controller sử dụng.
*/

export const validate = (schema: ZodType<any>) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Parse và validate dữ liệu từ request
            const validatedData = await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
                headers: req.headers,
            });

            // Gán dữ liệu đã validate vào request (chỉ body và params)
            req.body = validatedData.body || req.body;
            req.params = validatedData.params || req.params;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                // Trả về lỗi gốc từ Zod
                const errorMessages = error.issues.map(
                    (issue) => issue.message
                );

                // Ném lỗi với thông báo lỗi gốc từ Zod
                throw new BadRequestError(errorMessages.join(", "));
            }

            next(error);
        }
    };
};

// Helper function để validate dữ liệu trong service (optional)
export const validateData = async <T>(
    schema: ZodType<any>,
    data: any
): Promise<T> => {
    try {
        return await schema.parseAsync(data);
    } catch (error) {
        if (error instanceof ZodError) {
            const errorMessages = error.issues.map((issue) => issue.message);

            throw new BadRequestError(errorMessages.join(", "));
        }
        throw error;
    }
};