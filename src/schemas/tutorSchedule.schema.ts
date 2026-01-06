import { z } from "zod";

// Schema for getting tutor sessions (public - for students to view tutor schedule)
export const getTutorSessionsPublicSchema = z.object({
   params: z.object({
      tutorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tutor ID format"),
   }),
   query: z.object({
      startDate: z.string().datetime().optional(), // ISO date string
      endDate: z.string().datetime().optional(),   // ISO date string
      view: z.enum(["week", "month", "year"]).optional(),  // 'week' | 'month' | 'year'
   }),
});

export type GetTutorSessionsPublicParams = z.infer<typeof getTutorSessionsPublicSchema>["params"];
export type GetTutorSessionsPublicQuery = z.infer<typeof getTutorSessionsPublicSchema>["query"];

