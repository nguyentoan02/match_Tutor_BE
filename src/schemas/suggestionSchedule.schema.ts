import z from "zod";

export const SSchedules = z.object({
   dayOfWeek: z
      .number("day of week must be number")
      .min(0, "day of week must grater than 0")
      .max(6, "day of week must less than 7"),
   start: z.date("start time not valid"),
   end: z.date("end time not valid"),
});

const SuggestionSchedulesBodySchema = z.object({
   body: z.object({
      schedules: z.array(SSchedules),
      title: z.string("title not valid"),
   }),
});

export type SuggestionSchedulesBody = z.infer<
   typeof SuggestionSchedulesBodySchema
>["body"];
