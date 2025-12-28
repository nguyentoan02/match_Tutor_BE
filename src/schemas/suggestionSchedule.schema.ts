import z from "zod";

export const SSchedules = z.object({
   start: z.date("start time not valid"),
   end: z.date("end time not valid"),
});

export const SuggestionSchedulesBodySchema = z.object({
   body: z.object({
      TRId: z.string("learning request id not valid"),
      schedules: z.array(SSchedules),
      title: z.string("title not valid"),
   }),
});

export type SuggestionSchedulesBody = z.infer<
   typeof SuggestionSchedulesBodySchema
>["body"];
