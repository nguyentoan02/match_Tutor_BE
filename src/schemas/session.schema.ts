import { z } from "zod";
import { SESSION_STATUS_VALUES } from "../types/enums/session.enum";
import { REMINDER_METHOD_VALUES } from "../types/enums/reminder.enum";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const invalidIdMessage = "Invalid ID format";

export const createSessionSchema = z.object({
   body: z
      .object({
         teachingRequestId: z
            .string()
            .regex(objectIdRegex, "Invalid teaching request ID"),
         startTime: z
            .string()
            .datetime({ message: "Invalid start time format" }),
         endTime: z.string().datetime({ message: "Invalid end time format" }),
         isTrial: z.boolean().optional(),
         location: z.string().optional(),
         notes: z.string().optional(),
      })
      .refine((data) => new Date(data.endTime) > new Date(data.startTime), {
         message: "End time must be after start time",
         path: ["endTime"],
      }),
});

export const updateSessionSchema = z.object({
   body: z
      .object({
         startTime: z
            .string()
            .datetime({ message: "Invalid start time format" })
            .optional(),
         endTime: z
            .string()
            .datetime({ message: "Invalid end time format" })
            .optional(),
         status: z.enum(SESSION_STATUS_VALUES).optional(),
         location: z.string().optional(),
         notes: z.string().optional(),
         materials: z
            .array(z.string().regex(objectIdRegex, invalidIdMessage))
            .optional(),
         reminders: z
            .array(
               z.object({
                  userId: z.string().regex(objectIdRegex, invalidIdMessage),
                  minutesBefore: z.number().positive(),
                  methods: z.array(z.enum(REMINDER_METHOD_VALUES)),
               })
            )
            .optional(),
      })
      .partial()
      .refine(
         (data) => {
            if (data.startTime && data.endTime) {
               return new Date(data.endTime) > new Date(data.startTime);
            }
            return true;
         },
         {
            message: "End time must be after start time",
            path: ["endTime"],
         }
      ),
});

export type CreateSessionBody = z.infer<typeof createSessionSchema>["body"];
export type UpdateSessionBody = z.infer<typeof updateSessionSchema>["body"];
