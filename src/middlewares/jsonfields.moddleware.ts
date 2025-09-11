import { Request, Response, NextFunction } from "express";

const JSON_FIELDS = ["availability", "subjectsInterested", "address"];

// Cái này để parse các trường form data từ string về lại dạng json khi mà truyền formdata bên postman
export function parseJsonFields(
    req: Request,
    res: Response,
    next: NextFunction
) {
    if (req.body) {
        for (const field of JSON_FIELDS) {
            if (typeof req.body[field] === "string") {
                try {
                    req.body[field] = JSON.parse(req.body[field]);
                } catch (e) {
                    // Nếu parse lỗi thì giữ nguyên, để Zod báo lỗi
                }
            }
        }
    }
    next();
}
