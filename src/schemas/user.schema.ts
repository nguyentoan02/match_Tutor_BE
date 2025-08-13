import { z } from "zod";

// Schema for creating a user
export const createUserSchema = z.object({
    body: z.object({
        name: z
            .string()
            .min(2, "Name must be at least 2 characters")
            .max(50, "Name must not exceed 50 characters")
            .trim(),

        email: z.email("Invalid email format").toLowerCase().trim(),

        password: z
            .string()
            .min(6, "Password must be at least 6 characters")
            .max(100, "Password must not exceed 100 characters"),
    }),
});

// Schema for updating a user
export const updateUserSchema = z.object({
    body: z.object({
        name: z
            .string()
            .min(2, "Name must be at least 2 characters")
            .max(50, "Name must not exceed 50 characters")
            .trim()
            .optional(),

        email: z.email("Invalid email format").toLowerCase().trim().optional(),

        password: z
            .string()
            .min(6, "Password must be at least 6 characters")
            .max(100, "Password must not exceed 100 characters")
            .optional(),
    }),
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
    }),
});

// Schema for getting a user by ID
export const getUserByIdSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
    }),
});

// Schema for getting a user by email
export const getUserByEmailSchema = z.object({
    params: z.object({
        email: z.email("Invalid email format"),
    }),
});

// Schema for deleting a user
export const deleteUserSchema = z.object({
    params: z.object({
        id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid user ID format"),
    }),
});

// Export types for TypeScript
export type CreateUserBody = z.infer<typeof createUserSchema>["body"];
export type UpdateUserBody = z.infer<typeof updateUserSchema>["body"];
export type UpdateUserParams = z.infer<typeof updateUserSchema>["params"];
export type GetUserByIdParams = z.infer<typeof getUserByIdSchema>["params"];
export type GetUserByEmailParams = z.infer<
    typeof getUserByEmailSchema
>["params"];
export type DeleteUserParams = z.infer<typeof deleteUserSchema>["params"];
