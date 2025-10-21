import { z } from "zod";

// Schema for creating a review
export const createReviewSchema = z.object({
    body: z.object({
        teachingRequestId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid teaching request ID format"),
        rating: z.number().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
        comment: z
            .string()
            .max(1000, "Comment must not exceed 1000 characters")
            .optional()
            .or(z.literal("")),
    }),
});

// Schema for updating a review
export const updateReviewSchema = z.object({
    body: z.object({
        rating: z
            .number()
            .min(1, "Rating must be at least 1")
            .max(5, "Rating must be at most 5")
            .optional(),
        comment: z
            .string()
            .max(1000, "Comment must not exceed 1000 characters")
            .optional()
            .or(z.literal("")),
    }),
    params: z.object({
        reviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid review ID format"),
    }),
});

// Schema for getting tutor reviews
export const getTutorReviewsSchema = z.object({
    params: z.object({
        tutorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tutor ID format"),
    }),
});

// Schema for getting teaching request reviews
export const getTeachingRequestReviewsSchema = z.object({
    params: z.object({
        teachingRequestId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid teaching request ID format"),
    }),
});

// Schema for getting student review for teaching request
export const getStudentReviewForTeachingRequestSchema = z.object({
    params: z.object({
        teachingRequestId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid teaching request ID format"),
    }),
});

// Schema for deleting a review
export const deleteReviewSchema = z.object({
    params: z.object({
        reviewId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid review ID format"),
    }),
});

// Schema for getting tutor rating stats
export const getTutorRatingStatsSchema = z.object({
    params: z.object({
        tutorId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid tutor ID format"),
    }),
});

// Export types for TypeScript
export type CreateReviewBody = z.infer<typeof createReviewSchema>["body"];
export type UpdateReviewBody = z.infer<typeof updateReviewSchema>["body"];
export type UpdateReviewParams = z.infer<typeof updateReviewSchema>["params"];
export type GetTutorReviewsParams = z.infer<typeof getTutorReviewsSchema>["params"];
export type GetTeachingRequestReviewsParams = z.infer<typeof getTeachingRequestReviewsSchema>["params"];
export type GetStudentReviewForTeachingRequestParams = z.infer<typeof getStudentReviewForTeachingRequestSchema>["params"];
export type DeleteReviewParams = z.infer<typeof deleteReviewSchema>["params"];
export type GetTutorRatingStatsParams = z.infer<typeof getTutorRatingStatsSchema>["params"];