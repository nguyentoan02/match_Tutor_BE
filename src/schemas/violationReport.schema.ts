import { z } from "zod";
import { ViolationTypeEnum, ViolationStatusEnum } from "../types/enums/violationReport.enum";

// Schema for checking if student can report tutor
export const checkCanReportSchema = z.object({
   params: z.object({
      tutorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tutor ID format"),
   }),
});

// Schema for creating a violation report
export const createViolationReportSchema = z.object({
   body: z.object({
      tutorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tutor ID format"),
      type: z.nativeEnum(ViolationTypeEnum).optional(),
      reason: z.string().min(10, "Reason must be at least 10 characters").max(1000, "Reason must not exceed 1000 characters").optional(),
      evidenceFiles: z.array(z.string().url("Invalid URL format")).optional(),
      relatedTeachingRequestId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid teaching request ID format").optional(),
   }),
});

// Schema for getting violation reports (admin)
export const getViolationReportsSchema = z.object({
   query: z.object({
      page: z
         .string()
         .regex(/^\d+$/, "Page must be a number")
         .transform((val) => parseInt(val, 10))
         .refine((val) => val > 0, "Page must be greater than 0")
         .optional()
         .default("1"),
      limit: z
         .string()
         .regex(/^\d+$/, "Limit must be a number")
         .transform((val) => parseInt(val, 10))
         .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
         .optional()
         .default("10"),
      status: z.nativeEnum(ViolationStatusEnum).optional(),
      type: z.nativeEnum(ViolationTypeEnum).optional(),
   }),
});

// Schema for updating violation report status (admin)
export const updateViolationReportStatusSchema = z.object({
   params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid report ID format"),
   }),
   body: z.object({
      status: z.nativeEnum(ViolationStatusEnum),
   }),
});

export type CheckCanReportParams = z.infer<typeof checkCanReportSchema>["params"];
export type CreateViolationReportBody = z.infer<typeof createViolationReportSchema>["body"];
export type GetViolationReportsQuery = z.infer<typeof getViolationReportsSchema>["query"];
export type UpdateViolationReportStatusParams = z.infer<typeof updateViolationReportStatusSchema>["params"];
export type UpdateViolationReportStatusBody = z.infer<typeof updateViolationReportStatusSchema>["body"];


