import { z } from "zod";
import { SUBJECT_VALUES, LEVEL_VALUES, CLASS_TYPE_VALUES, TIME_SLOT_VALUES } from "../types/enums";
import { ClassType } from "../types/enums/classType.enum";

// Helper function to parse JSON strings from FormData
const parseJsonString = <T>(schema: z.ZodType<T>) =>
    z.preprocess((val) => {
        if (typeof val === "string") {
            try {
                return JSON.parse(val);
            } catch {
                return val;
            }
        }
        return val;
    }, schema);

// Helper function to parse number strings from FormData
const parseNumberString = (numberSchema: z.ZodNumber) =>
    z.preprocess((val) => {
        if (typeof val === "string") {
            const parsed = parseFloat(val);
            return isNaN(parsed) ? val : parsed;
        }
        return val;
    }, numberSchema);

// Helper schemas for nested objects
const educationSchema = z.object({
    institution: z.string().min(1, "Institution is required").max(100, "Institution too long"),
    degree: z.string().min(1, "Degree is required").max(50, "Degree too long"),
    fieldOfStudy: z.string().max(50, "Field of study too long").optional(),
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
    imageUrls: z.array(z.string().url("Invalid image URL")).max(10, "Maximum 10 images allowed").optional().default([]),
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
        // Add .default([]) to ALL required arrays
        subjects: parseJsonString(
            z.array(SubjectEnum)
                .min(1, "At least one subject is required")
                .max(10, "Maximum 10 subjects allowed")
        ).default([]),

        levels: parseJsonString(
            z.array(LevelEnum)
                .min(1, "At least one level is required")
                .max(10, "Maximum 10 levels allowed")
        ).default([]),

        education: parseJsonString(
            z.array(educationSchema)
                .min(1, "At least one education entry is required")
                .max(5, "Maximum 5 education entries allowed")
        ).default([]),

        // Add defaults to number fields too
        experienceYears: parseNumberString(
            z.number()
                .min(0, "Experience years cannot be negative")
                .max(50, "Experience years too high")
                .int("Must be whole number")
        ).default(0),

        hourlyRate: parseNumberString(
            z.number()
                .min(0, "Hourly rate cannot be negative")
                .max(1000, "Hourly rate too high")
        ).default(0),

        bio: z.string()
            .min(10, "Bio must be at least 50 characters")
            .max(1000, "Bio must not exceed 1000 characters")
            .trim()
            .default(""),

        classType: ClassTypeEnum.default(ClassType.ONLINE),

        // Optional fields with defaults
        certifications: parseJsonString(
            z.array(certificationSchema)
                .max(10, "Maximum 10 certifications allowed")
        ).optional().default([]),

        availability: parseJsonString(
            z.array(availabilitySchema)
                .max(12, "Maximum 12 availability entries allowed")
        ).optional().default([]),

        languages: parseJsonString(z.array(z.string())).optional().default([]),

        // Other optional fields with defaults
        fullName: z.string().min(2, "Name must be at least 2 characters").optional().default(""),
        gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
        address: parseJsonString(
            z.object({
                city: z.string().optional().default(""),
                street: z.string().optional().default(""),
                lat: z.number().optional(),
                lng: z.number().optional(),
            })
        ).optional().default({ city: "", street: "", lat: undefined, lng: undefined }),
        contact: parseJsonString(
            z.object({
                phone: z.string().optional().default(""),
                email: z.string().email().optional().default(""),
            })
        ).optional().default({ phone: "", email: "" }),
    }),
});

// Create Tutor Profile Schema for FormData
export const updateTutorProfileSchema = z.object({
    body: z.object({
        // Add .default([]) to ALL required arrays
        subjects: parseJsonString(
            z.array(SubjectEnum)
                .min(1, "At least one subject is required")
                .max(10, "Maximum 10 subjects allowed")
        ).default([]),

        levels: parseJsonString(
            z.array(LevelEnum)
                .min(1, "At least one level is required")
                .max(10, "Maximum 10 levels allowed")
        ).default([]),

        education: parseJsonString(
            z.array(educationSchema)
                .min(1, "At least one education entry is required")
                .max(5, "Maximum 5 education entries allowed")
        ).default([]),

        // Add defaults to number fields too
        experienceYears: parseNumberString(
            z.number()
                .min(0, "Experience years cannot be negative")
                .max(50, "Experience years too high")
                .int("Must be whole number")
        ).default(0),

        hourlyRate: parseNumberString(
            z.number()
                .min(0, "Hourly rate cannot be negative")
                .max(1000, "Hourly rate too high")
        ).default(0),

        bio: z.string()
            .min(10, "Bio must be at least 50 characters")
            .max(1000, "Bio must not exceed 1000 characters")
            .trim()
            .default(""),

        classType: ClassTypeEnum.default(ClassType.ONLINE),

        // Optional fields with defaults
        certifications: parseJsonString(
            z.array(certificationSchema)
                .max(10, "Maximum 10 certifications allowed")
        ).optional().default([]),

        availability: parseJsonString(
            z.array(availabilitySchema)
                .max(12, "Maximum 12 availability entries allowed")
        ).optional().default([]),

        languages: parseJsonString(z.array(z.string())).optional().default([]),

        // Other optional fields with defaults
        fullName: z.string().min(2, "Name must be at least 2 characters").optional().default(""),
        gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
        address: parseJsonString(
            z.object({
                city: z.string().optional().default(""),
                street: z.string().optional().default(""),
                lat: z.number().optional(),
                lng: z.number().optional(),
            })
        ).optional().default({ city: "", street: "", lat: undefined, lng: undefined }),
        contact: parseJsonString(
            z.object({
                phone: z.string().optional().default(""),
                email: z.string().email().optional().default(""),
            })
        ).optional().default({ phone: "", email: "" }),
    }),
});

export type CreateTutorInput = z.infer<typeof createTutorProfileSchema>["body"];
export type UpdateTutorInput = z.infer<typeof updateTutorProfileSchema>["body"];
