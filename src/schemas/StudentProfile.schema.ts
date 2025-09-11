import z from "zod";
import { SUBJECT_VALUES } from "../types/enums/subject.enum";
import { LEVEL_VALUES } from "../types/enums/level.enum";
import { TIME_SLOT_VALUES } from "../types/enums/timeSlot.enum";

const availabilitySchema = z.object({
    dayOfWeek: z.number().int().min(0).max(7),
    slots: z.array(z.enum(TIME_SLOT_VALUES)).default([]),
});

export const createStudentProfileSchema = z.object({
    body: z.object({
        subjectsInterested: z.array(z.enum(SUBJECT_VALUES)).default([]),
        gradeLevel: z.enum(LEVEL_VALUES),
        bio: z.string().optional(),
        learningGoals: z.string().optional(),
        availability: z.array(availabilitySchema).optional(),
    }),
});

export const updateStudentProfileSchema = z.object({
    body: z.object({
        subjectsInterested: z.array(z.enum(SUBJECT_VALUES)).optional(),
        gradeLevel: z.enum(LEVEL_VALUES).optional(),
        bio: z.string().optional(),
        learningGoals: z.string().optional(),
        availability: z.array(availabilitySchema).optional(),
    }),
});

export type UpdateStudentProfileBody = z.infer<
    typeof updateStudentProfileSchema
>;
export type CreateStudentProfileBody = z.infer<
    typeof createStudentProfileSchema
>["body"];
