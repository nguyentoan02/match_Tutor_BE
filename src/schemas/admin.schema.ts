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
         .refine(
            (val) => val > 0 && val <= 100,
            "Limit must be between 1 and 100"
         )
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
         .refine(
            (val) => val > 0 && val <= 100,
            "Limit must be between 1 and 100"
         )
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
         .refine(
            (val) => val > 0 && val <= 100,
            "Limit must be between 1 and 100"
         )
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
         .refine(
            (val) => val > 0 && val <= 100,
            "Limit must be between 1 and 100"
         )
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
         .refine(
            (val) => val > 0 && val <= 100,
            "Limit must be between 1 and 100"
         )
         .optional()
         .default(10),
      search: z.string().optional(),
   }),
});

export const getTransactionHistorySchema = z.object({
   query: z
      .object({
         page: z
            .coerce.number()
            .int()
            .positive()
            .max(1000)
            .optional()
            .default(1),
         limit: z
            .coerce.number()
            .int()
            .positive()
            .max(100)
            .optional()
            .default(20),
         type: z.enum(["package", "learningCommitment"]).optional(),
         status: z.enum(["PENDING", "SUCCESS", "FAILED", "PAID"]).optional(),
         userId: z.string().regex(/^[0-9a-fA-F]{24}$/).optional(),
         search: z.string().optional(),
         startDate: z.coerce.date().optional(),
         endDate: z.coerce.date().optional(),
      })
      .refine(
         (data) =>
            !data.startDate || !data.endDate || data.startDate <= data.endDate,
         {
            message: "startDate must be earlier than or equal to endDate",
            path: ["endDate"],
         }
      ),
});

// Schema for accepting a tutor
export const acceptTutorSchema = z.object({
   params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tutor ID format"),
   }),
});

// Schema for rejecting a tutor
export const rejectTutorSchema = z.object({
   params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tutor ID format"),
   }),
   body: z.object({
      reason: z
         .string()
         .min(10, "Rejection reason must be at least 10 characters")
         .max(500, "Rejection reason must not exceed 500 characters")
         .trim(),
   }),
});

// Schema for getting pending tutors
export const getPendingTutorsSchema = z.object({
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
         .refine(
            (val) => val > 0 && val <= 100,
            "Limit must be between 1 and 100"
         )
         .optional()
         .default(10),
      search: z.string().optional(),
   }),
});

export const createPackageSchema = z.object({
	body: z.object({
		name: z.string().min(1, "Name is required").max(100, "Name must not exceed 100 characters"),
		description: z.array(z.string().max(500, "Each description item must not exceed 500 characters")).optional(),
		price: z.number().nonnegative("Price must be non-negative").max(1000000000, "Price must not exceed 1 billion"),
		features: z
			.object({
				boostVisibility: z.boolean().optional(),
				priorityRanking: z.boolean().optional(),
                maxStudents: z.number().int().nonnegative("maxStudents must be non-negative integer").max(10000, "maxStudents must not exceed 10000").optional(),
                maxQuiz: z.number().int().nonnegative("maxQuiz must be non-negative integer").max(10000, "maxQuiz must not exceed 10000").optional(),
				featuredProfile: z.boolean().optional(),
			})
			.optional(),
		isActive: z.boolean().optional(),
		popular: z.boolean().optional(),
	}),
});

export const updatePackageSchema = z.object({
	params: z.object({ id: z.string().min(1) }),
	body: z
		.object({
			name: z.string().min(1, "Name must not be empty").max(100, "Name must not exceed 100 characters").optional(),
			description: z.array(z.string().max(500, "Each description item must not exceed 500 characters")).optional(),
			price: z.number().nonnegative("Price must be non-negative").max(1000000000, "Price must not exceed 1 billion").optional(),
			features: z
				.object({
					boostVisibility: z.boolean().optional(),
					priorityRanking: z.boolean().optional(),
                    maxStudents: z.number().int().nonnegative("maxStudents must be non-negative integer").max(10000, "maxStudents must not exceed 10000").optional(),
                    maxQuiz: z.number().int().nonnegative("maxQuiz must be non-negative integer").max(10000, "maxQuiz must not exceed 10000").optional(),
					featuredProfile: z.boolean().optional(),
				})
				.optional(),
			isActive: z.boolean().optional(),
			popular: z.boolean().optional(),
		})
		.strict(),
});

export const listPackagesSchema = z.object({
	query: z.object({
		page: z.coerce.number().int().positive().optional(),
		limit: z.coerce.number().int().positive().optional(),
		isActive: z.enum(["true", "false"]).optional(),
	}),
});

export const getPackageByIdSchema = z.object({
	params: z.object({ id: z.string().min(1) }),
});

export const getTutorsUsingPackageSchema = z.object({
	params: z.object({ id: z.string().min(1) }),
	query: z.object({
		page: z.coerce.number().int().positive().optional(),
		limit: z.coerce.number().int().positive().optional(),
	}),
});

export const updatePackageStatusSchema = z.object({
	params: z.object({ id: z.string().min(1) }),
	body: z.object({
		isActive: z.boolean(),
		popular: z.boolean().optional(),
	}),
});

// Export types for TypeScript
export type BanUserParams = z.infer<typeof banUserSchema>["params"];
export type BanUserBody = z.infer<typeof banUserSchema>["body"];
export type UnbanUserParams = z.infer<typeof unbanUserSchema>["params"];
export type GetBannedUsersQuery = z.infer<typeof getBannedUsersSchema>["query"];
export type GetUserBanHistoryParams = z.infer<
   typeof getUserBanHistorySchema
>["params"];
export type GetBannedTutorsQuery = z.infer<
   typeof getBannedTutorsSchema
>["query"];
export type GetActiveTutorsQuery = z.infer<
   typeof getActiveTutorsSchema
>["query"];
export type GetBannedStudentsQuery = z.infer<
   typeof getBannedStudentsSchema
>["query"];
export type GetActiveStudentsQuery = z.infer<
   typeof getActiveStudentsSchema
>["query"];
export type AcceptTutorParams = z.infer<typeof acceptTutorSchema>["params"];
export type RejectTutorParams = z.infer<typeof rejectTutorSchema>["params"];
export type RejectTutorBody = z.infer<typeof rejectTutorSchema>["body"];
export type GetPendingTutorsQuery = z.infer<
   typeof getPendingTutorsSchema
>["query"];
export type GetAdminTransactionHistoryQuery = z.infer<
   typeof getTransactionHistorySchema
>["query"];

// Schema for getting admin wallet balance (no query params needed)
export const getAdminWalletBalanceSchema = z.object({
   query: z.object({}).optional(),
});

// Schema for hiding a tutor (due to violation report)
export const hideTutorSchema = z.object({
   params: z.object({
      id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tutor ID format"),
   }),
});

export type HideTutorParams = z.infer<typeof hideTutorSchema>["params"];