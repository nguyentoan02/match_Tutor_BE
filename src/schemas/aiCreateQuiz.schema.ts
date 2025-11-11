import z from "zod";

export const learningMaterialSchema = z.object({
   body: z.object({
      materialId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid session ID"),
   }),
});

export type learningMaterial = z.infer<typeof learningMaterialSchema>["body"];
