import { Request, Response, NextFunction } from "express";

const JSON_FIELDS = [
    "subjects",
    "levels",
    "education",
    "certifications",
    "availability",
    "address",
    "imageCertMapping",
    "classType"
];
const NUMBER_FIELDS = ["experienceYears", "hourlyRate"];

// Cái này để parse các trường form data từ string về lại dạng json khi mà truyền formdata bên postman
export function parseJsonFields(req: Request, res: Response, next: NextFunction) {
    if (req.body) {
        // Convert JSON strings → objects/arrays
        for (const field of JSON_FIELDS) {
            if (typeof req.body[field] === "string") {
                try {
                    req.body[field] = JSON.parse(req.body[field]);
                } catch {
                    // If parse fails → let Zod handle the error
                }
            }
        }

        // Convert number strings → numbers
        for (const field of NUMBER_FIELDS) {
            if (typeof req.body[field] === "string") {
                const num = Number(req.body[field]);
                if (!isNaN(num)) {
                    req.body[field] = num;
                }
            }
        }
    }

    next();
}
