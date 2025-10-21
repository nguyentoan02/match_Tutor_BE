import { z } from "zod";
import { DECISION_STATUS_VALUES } from "../types/enums/teachingRequest.enum";
import { LEVEL_VALUES } from "../types/enums/level.enum";
import { SUBJECT_VALUES } from "../types/enums/subject.enum";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const invalidIdMessage = "Invalid ID format";

export const createTeachingRequestSchema = z.object({
   body: z.object({
      tutorId: z.string().regex(objectIdRegex, "Invalid tutor ID"),
      subject: z.enum(SUBJECT_VALUES),
      level: z.enum(LEVEL_VALUES),
      hourlyRate: z.number().min(0, "Hourly rate must be non-negative"),
      description: z.string().optional(),
      totalSessionsPlanned: z
         .number()
         .min(1, "Total sessions must be at least 1")
         .optional(),
   }),
});

export const respondToRequestSchema = z.object({
   params: z.object({
      id: z.string().regex(objectIdRegex, invalidIdMessage),
   }),
   body: z.object({
      decision: z.enum(["ACCEPTED", "REJECTED"]),
   }),
});

export const trialDecisionSchema = z.object({
   params: z.object({
      id: z.string().regex(objectIdRegex, invalidIdMessage),
   }),
   body: z.object({
      decision: z.enum(DECISION_STATUS_VALUES),
   }),
});

export const cancellationRequestSchema = z.object({
   params: z.object({
      id: z.string().regex(objectIdRegex, invalidIdMessage),
   }),
   body: z.object({
      reason: z.string().trim().min(1, "Cancellation reason is required"),
   }),
});

export const completionRequestSchema = z.object({
   params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
   }),
   body: z.object({
      reason: z.string().optional(),
   }),
});

export const confirmActionSchema = z.object({
   params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
   }),
   body: z.object({
      decision: z.enum(["ACCEPTED", "REJECTED"]),
      reason: z.string().optional(), // Add optional reason
   }),
});

export const getAdminReviewRequestsSchema = z.object({
   query: z.object({
      page: z
         .string()
         .regex(/^\d+$/, "Page must be a number")
         .transform((val) => parseInt(val, 10))
         .refine((val) => val > 0, "Page must be greater than 0")
         .optional()
         .default(1),
      limit: z
         .string()
         .regex(/^\d+$/, "Limit must be a number")
         .transform((val) => parseInt(val, 10))
         .refine(
            (val) => val > 0 && val <= 100,
            "Limit must be between 1 and 100"
         )
         .optional()
         .default(10),
   }),
});

export const resolveAdminReviewSchema = z.object({
   params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
   }),
   body: z.object({
      decision: z.enum(["ACCEPTED", "REJECTED"]),
      adminNotes: z.string().optional(),
   }),
});

export type CreateTeachingRequestBody = z.infer<
   typeof createTeachingRequestSchema
>["body"];
export type GetAdminReviewRequestsQuery = z.infer<
   typeof getAdminReviewRequestsSchema
>["query"];
export type ResolveAdminReviewParams = z.infer<
   typeof resolveAdminReviewSchema
>["params"];
export type ResolveAdminReviewBody = z.infer<
   typeof resolveAdminReviewSchema
>["body"];
