import { z } from "zod";
import { SUBJECT_VALUES, LEVEL_VALUES, CLASS_TYPE_VALUES, TIME_SLOT_VALUES, GENDER_VALUES } from "../types/enums";
import { ClassType } from "../types/enums/classType.enum";

// Helper schemas for nested objects
const educationSchema = z.object({
    institution: z.string().min(1, "Institution is required").max(70, "Institution too long"),
    degree: z.string().min(1, "Degree is required").max(50, "Degree too long"),
    fieldOfStudy: z.string().max(50, "Field of study too long"),
    startDate: z.string()
        .regex(/^\d{4}-\d{2}$/, "Valid start date required (YYYY-MM)")
        .transform((d) => new Date(d + "-01")), // Convert "2025-07" to "2025-07-01"
    endDate: z.string()
        .regex(/^\d{4}-\d{2}$/, "Valid end date required (YYYY-MM)")
        .optional()
        .transform((d) => d ? new Date(d + "-01") : undefined),
    description: z.string().max(500, "Description too long").optional(),
});

const certificationSchema = z.object({
    name: z.string().min(1, "Certification name is required").max(100, "Name too long"),
    description: z.string().max(300, "Description too long").optional(),
    imageUrls: z.array(z.string().url("Invalid image URL")).max(10, "Maximum 10 images allowed").default([]),
});

const availabilitySchema = z.object({
    dayOfWeek: z.number().min(0).max(7, "Day of week must be between 0-7"),
    slots: z.array(
        z.enum(TIME_SLOT_VALUES as [string, ...string[]])
    ).optional(),
});

// Zod enums from your TypeScript enums
const SubjectEnum = z.enum(SUBJECT_VALUES as [string, ...string[]]);
const LevelEnum = z.enum(LEVEL_VALUES as [string, ...string[]]);
const ClassTypeEnum = z.enum(CLASS_TYPE_VALUES as [string, ...string[]]);

// Create Tutor Profile Schema for FormData
export const createTutorProfileSchema = z.object({
    body: z.object({
        avatarUrl: z.string().url("Avatar must be a valid URL").optional(),
        gender: z.enum(GENDER_VALUES, { error: "Gender is required" }),
        subjects:
            z.array(SubjectEnum)
                .min(1, "At least one subject is required")
                .max(10, "Maximum 10 subjects allowed"),

        levels:
            z.array(LevelEnum)
                .min(1, "At least one level is required")
                .max(10, "Maximum 10 levels allowed"),

        education:
            z.array(educationSchema)
                .min(1, "At least one education entry is required")
                .max(5, "Maximum 5 education entries allowed")
                .default([]),

        // Add defaults to number fields too
        experienceYears:
            z.number()
                .min(0, "Experience years cannot be negative")
                .max(50, "Experience years too high")
                .default(0),

        hourlyRate:
            z.number()
                .min(0, "Hourly rate cannot be negative")
                .max(1000, "Hourly rate too high")
                .default(0),

        bio: z.string()
            .min(50, "Bio must be at least 50 characters")
            .max(2000, "Bio must not exceed 2000 characters")
            .trim()
            .default(""),

        classType: ClassTypeEnum.default(ClassType.ONLINE),

        // Optional fields with defaults
        certifications:
            z.array(certificationSchema)
                .min(1, "At least one certification entry is required")
                .max(10, "Maximum 10 certifications allowed")
                .default([]),

        availability:
            z.array(availabilitySchema)
                .min(1, "At least one availability entry is required")
                .max(12, "Maximum 12 availability entries allowed")
        ,

        name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must not exceed 50 characters"),
        address:
            z.object({
                city: z.string().default(""),
                street: z.string().default(""),
                lat: z.number().optional(),
                lng: z.number().optional(),
            }),
        phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),

    }),
});

// Create Tutor Profile Schema for FormData
export const updateTutorProfileSchema = z.object({
    body: z.object({
        avatarUrl: z.string().url("Avatar must be a valid URL").optional(),
        gender: z.enum(GENDER_VALUES, { error: "Gender is required" }),
        subjects:
            z.array(SubjectEnum)
                .min(1, "At least one subject is required")
                .max(10, "Maximum 10 subjects allowed"),

        levels:
            z.array(LevelEnum)
                .min(1, "At least one level is required")
                .max(10, "Maximum 10 levels allowed"),

        education:
            z.array(educationSchema)
                .min(1, "At least one education entry is required")
                .max(5, "Maximum 5 education entries allowed")
                .default([]),

        // Add defaults to number fields too
        experienceYears:
            z.number()
                .min(0, "Experience years cannot be negative")
                .max(50, "Experience years too high")
                .default(0),

        hourlyRate:
            z.number()
                .min(0, "Hourly rate cannot be negative")
                .max(1000, "Hourly rate too high")
                .default(0),

        bio: z.string()
            .min(50, "Bio must be at least 50 characters")
            .max(2000, "Bio must not exceed 2000 characters")
            .trim()
            .default(""),

        classType: ClassTypeEnum.default(ClassType.ONLINE),

        // Optional fields with defaults
        certifications:
            z.array(certificationSchema)
                .min(1, "At least one certification entry is required")
                .max(10, "Maximum 10 certifications allowed")
                .default([]),

        availability:
            z.array(availabilitySchema)
                .min(1, "At least one availability entry is required")
                .max(12, "Maximum 12 availability entries allowed")
                .default([]),

        // Other optional fields with defaults
        name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must not exceed 50 characters"),
        address:
            z.object({
                city: z.string().default(""),
                street: z.string().default(""),
                lat: z.number().optional(),
                lng: z.number().optional(),
            }),
        phone: z.string().regex(/^\d{10}$/, "Phone must be exactly 10 digits"),
        imageCertMapping: z.array(z.object({
            certIndex: z.number().min(0),
            fileIndex: z.number().min(0),
        })).default([]),

    }),
});

export type CreateTutorInput = z.infer<typeof createTutorProfileSchema>["body"];
export type UpdateTutorInput = z.infer<typeof updateTutorProfileSchema>["body"];
