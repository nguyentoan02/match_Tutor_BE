import z from "zod";

const answerSchema = z.object({
   questionId: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "questionId must be a valid ObjectId"),
   // answer can be string, number, array, or other mixed types depending on question type
   answer: z.union([
      z.string(),
      z.number(),
      z.array(z.string()),
      z.array(z.number()),
      z.boolean(),
   ]),
});

export const submitQuizBodySchema = z.object({
   body: z.object({
      quizId: z
         .string()
         .regex(/^[0-9a-fA-F]{24}$/, "quizId must be a valid ObjectId"),
      answers: z.array(answerSchema).min(1, "At least one answer is required"),
      // Optional: capture quiz snapshot at submission time
      quizSnapshot: z
         .object({
            quizMode: z.string().optional(),
            settings: z.record(z.string(), z.any()).optional(),
         })
         .optional(),
   }),
});

export const submitQuizIdQuerySchema = z.object({
   query: z.object({
      quizId: z.string().regex(/^[0-9a-fA-F]{24}$/, {
         message: "tutorId must be a valid MongoDB ObjectId",
      }),
   }),
});

// Export types
export type SubmitQuizBody = z.infer<typeof submitQuizBodySchema>["body"];
export type SubmitQUizIdQuery = z.infer<
   typeof submitQuizIdQuerySchema
>["query"];
