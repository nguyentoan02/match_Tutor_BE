import { z } from "zod";
import { Gender } from "../types/enums/gender.enum";

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

// Zod enum from TypeScript enum values (cast to tuple to satisfy z.enum signature)
const GenderEnum = z.enum(Object.values(Gender) as [string, ...string[]]);

// Schema for updating a user
export const updateUserSchema = z.object({
   body: z.object({
      name: z
         .string()
         .min(2, "Name must be at least 2 characters")
         .max(50, "Name must not exceed 50 characters")
         .trim()
         .optional(),

      // allow empty string -> treated as undefined
      phone: z
         .preprocess(
            (val) =>
               typeof val === "string" && val.trim() === "" ? undefined : val,
            z.string().regex(/^[0-9]{10}$/, "Phone must be exactly 10 digits")
         )
         .optional(),

      // Optional URL in case client provides an avatar URL instead of uploading file
      avatarUrl: z
         .preprocess(
            (v) => (v === "" ? undefined : v),
            z.url({ message: "Invalid avatar URL" })
         )
         .optional(),

      // Gender (optional) — use z.enum(...) from TS enum values
      gender: GenderEnum.optional(),

      // Address: accept object OR JSON string (from FormData). Empty string -> undefined
      address: z.preprocess(
         (val) => {
            if (typeof val === "string") {
               const s = val.trim();
               if (!s) return undefined;
               try {
                  return JSON.parse(s);
               } catch {
                  return undefined;
               }
            }
            return val;
         },
         z
            .object({
               city: z.string().optional(),
               street: z.string().optional(),
               lat: z.number().optional(),
               lng: z.number().optional(),
            })
            .optional()
      ),
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
export type UpdateUserParams = z.infer<typeof updateUserSchema>["body"];
export type GetUserByIdParams = z.infer<typeof getUserByIdSchema>["params"];
export type GetUserByEmailParams = z.infer<
   typeof getUserByEmailSchema
>["params"];
export type DeleteUserParams = z.infer<typeof deleteUserSchema>["params"];
