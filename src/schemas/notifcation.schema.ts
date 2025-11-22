import { z } from "zod";

export const notificationQuerySchema = z.object({
   query: z.object({
      page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
      limit: z.string().optional().transform((val) => val ? parseInt(val) : 20),
   }),
});

export const notificationParamsSchema = z.object({
   params: z.object({
      notificationId: z.string().min(1, "Notification ID is required"),
   }),
});

export type NotificationQueryType = z.infer<typeof notificationQuerySchema>;
export type NotificationParamsType = z.infer<typeof notificationParamsSchema>;