import { z } from "zod";

export const listSessionDisputesSchema = z.object({
   query: z
      .object({
         status: z.enum(["OPEN", "RESOLVED"]).optional(),
      })
      .optional(),
});

export const getSessionDisputeSchema = z.object({
   params: z.object({
      sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid session ID"),
   }),
});

export const resolveSessionDisputeSchema = z.object({
   params: z.object({
      sessionId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid session ID"),
   }),
   body: z.object({
      decision: z.enum(["COMPLETED", "NOT_CONDUCTED"]),
      adminNotes: z.string().trim().min(5).max(1000).optional(),
   }),
});

export type ResolveSessionDisputeBody = z.infer<typeof resolveSessionDisputeSchema>["body"];

