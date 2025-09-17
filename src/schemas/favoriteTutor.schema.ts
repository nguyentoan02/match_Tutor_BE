import z from "zod";

export const favoriteTutorBodySchema = z.object({
   body: z.object({
      favoriteTutorId: z.string().regex(/^[0-9a-fA-F]{24}$/, {
         message: "favoriteTutorId must be a valid MongoDB ObjectId",
      }),
   }),
});

export type favoriteTutorBody = z.infer<typeof favoriteTutorBodySchema>["body"];
