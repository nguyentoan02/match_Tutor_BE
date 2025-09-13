import z from "zod";
import { SUBJECT_VALUES } from "../types/enums/subject.enum";
import { LEVEL_VALUES } from "../types/enums/level.enum";
import { TIME_SLOT_VALUES } from "../types/enums/timeSlot.enum";
import { GENDER_VALUES } from "../types/enums/gender.enum";

const addressSchema = z.object({
   city: z.string().min(1, "City is required"),
   street: z.string().min(1, "Street is required"),
   lat: z.number().optional(),
   lng: z.number().optional(),
});

const availabilitySchema = z.object({
   dayOfWeek: z.number().int().min(0).max(7),
   slots: z
      .array(z.enum(TIME_SLOT_VALUES))
      .min(1, "At least 1 slot is required"),
});

// CREATE schema
export const createStudentProfileSchema = z.object({
   body: z.object({
      name: z.string().max(50, "Name must be at most 50 characters"),
      phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
      avatarUrl: z.string().url("Avatar must be a valid URL").optional(),
      gender: z.enum(GENDER_VALUES, { error: "Gender is required" }),
      address: addressSchema,
      subjectsInterested: z
         .array(z.enum(SUBJECT_VALUES))
         .min(1, "At least 1 subject is required"),
      gradeLevel: z.enum(LEVEL_VALUES, {
         error: "Grade level is required",
      }),
      bio: z.string().min(1, "Bio is required"),
      learningGoals: z.string().min(1, "Learning goal is required"),
      availability: z
         .array(availabilitySchema)
         .min(1, "At least 1 availability is required"),
   }),
});

// UPDATE schema (tất cả optional, nhưng nếu có thì phải đúng định dạng)
export const updateStudentProfileSchema = z.object({
   body: z.object({
      name: z.string().max(50, "Name must be at most 50 characters"),
      phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
      avatarUrl: z.string().url("Avatar must be a valid URL").optional(),
      gender: z.enum(GENDER_VALUES, { error: "Gender is required" }),
      address: addressSchema,
      subjectsInterested: z
         .array(z.enum(SUBJECT_VALUES))
         .min(1, "At least 1 subject is required"),
      gradeLevel: z.enum(LEVEL_VALUES, {
         error: "Grade level is required",
      }),
      bio: z.string().min(1, "Bio is required"),
      learningGoals: z.string().min(1, "Learning goal is required"),
      availability: z
         .array(availabilitySchema)
         .min(1, "At least 1 availability is required"),
   }),
});

export type UpdateStudentProfileBody = z.infer<
   typeof updateStudentProfileSchema
>["body"];
export type CreateStudentProfileBody = z.infer<
   typeof createStudentProfileSchema
>["body"];
