import { z } from "zod";

// Schema for banning a user
export const banUserSchema = z.object({
   params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
   }),
   body: z.object({
      reason: z
         .string()
         .min(10, "Ban reason must be at least 10 characters")
         .max(500, "Ban reason must not exceed 500 characters")
         .trim(),
   }),
});

// Schema for unbanning a user
export const unbanUserSchema = z.object({
   params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
   }),
});

// Schema for getting banned users list
export const getBannedUsersSchema = z.object({
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
         .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
         .optional()
         .default(10),
      search: z.string().optional(),
   }),
});

// Schema for getting user ban history
export const getUserBanHistorySchema = z.object({
   params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
   }),
});

// Schema for getting banned tutors
export const getBannedTutorsSchema = z.object({
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
         .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
         .optional()
         .default(10),
      search: z.string().optional(),
   }),
});

// Schema for getting active tutors
export const getActiveTutorsSchema = z.object({
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
         .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
         .optional()
         .default(10),
      search: z.string().optional(),
   }),
});

// Schema for getting banned students
export const getBannedStudentsSchema = z.object({
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
         .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
         .optional()
         .default(10),
      search: z.string().optional(),
   }),
});

// Schema for getting active students
export const getActiveStudentsSchema = z.object({
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
         .refine((val) => val > 0 && val <= 100, "Limit must be between 1 and 100")
         .optional()
         .default(10),
      search: z.string().optional(),
   }),
});

// Export types for TypeScript
export type BanUserParams = z.infer<typeof banUserSchema>["params"];
export type BanUserBody = z.infer<typeof banUserSchema>["body"];
export type UnbanUserParams = z.infer<typeof unbanUserSchema>["params"];
export type GetBannedUsersQuery = z.infer<typeof getBannedUsersSchema>["query"];
export type GetUserBanHistoryParams = z.infer<typeof getUserBanHistorySchema>["params"];
export type GetBannedTutorsQuery = z.infer<typeof getBannedTutorsSchema>["query"];
export type GetActiveTutorsQuery = z.infer<typeof getActiveTutorsSchema>["query"];
export type GetBannedStudentsQuery = z.infer<typeof getBannedStudentsSchema>["query"];
export type GetActiveStudentsQuery = z.infer<typeof getActiveStudentsSchema>["query"];
