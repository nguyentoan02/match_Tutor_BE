import { Request, Response } from "express";
import { SuccessResponse } from "../utils/success.response";
import tutorService from "../services/tutor.service";
import { CreateTutorInput, UpdateTutorInput } from "../schemas/tutor.schema";
import { UnauthorizedError } from "../utils/error.response";

export class TutorController {
    // Get all tutors
    async getAllTutors(req: Request, res: Response) {
        const tutors = await tutorService.getAllTutors();

        new SuccessResponse({
            message: "All tutors retrieved successfully",
            metadata: tutors
        }).send(res);
    }

    // Get only approved tutors
    async getApprovedTutors(req: Request, res: Response) {
        const tutors = await tutorService.getApprovedTutors();

        new SuccessResponse({
            message: "Approved tutors retrieved successfully",
            metadata: tutors
        }).send(res);
    }

    // Get one tutor by ID
    async getTutorById(req: Request, res: Response) {
        const { id } = req.params;
        const tutor = await tutorService.getTutorById(id);

        new SuccessResponse({
            message: "Tutor retrieved successfully",
            metadata: tutor
        }).send(res);
    }

    // Get tutor by user ID (for current user's tutor profile)
    async getMyTutorProfile(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
        }
        const tutor = await tutorService.getTutorByUserId(String(currentUser._id));

        if (!tutor) {
            return res.status(404).json({ message: "Tutor profile not found" });
        }

        new SuccessResponse({
            message: "Tutor profile retrieved successfully",
            metadata: tutor
        }).send(res);
    }

    async createTutorProfile(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
        }

        const parsedData = TutorController.parseFormData(req.body);

        const avatarFile = req.files && (req.files as any).avatar
            ? (req.files as any).avatar[0]
            : undefined;

        const certificationFiles = req.files && (req.files as any).certificationImages
            ? (req.files as any).certificationImages
            : [];

        // Ensure required fields are present and not undefined
        const requiredFields = [
            "subjects",
            "levels",
            "experienceYears",
            "hourlyRate",
            "bio",
            "classType",
            "education"
        ] as const;
        for (const field of requiredFields) {
            if (parsedData[field as keyof typeof parsedData] === undefined) {
                return res.status(400).json({ message: `Missing required field: ${field}` });
            }
        }

        const newTutor = await tutorService.createTutorProfile(
            String(currentUser._id),
            parsedData as CreateTutorInput,
            avatarFile,
            certificationFiles
        );

        new SuccessResponse({
            message: "Tutor profile created successfully",
            metadata: newTutor,
        }).send(res);
    }

    async updateTutorProfile(req: Request, res: Response) {
        const userId = req.user?._id;
        if (!userId) throw new Error("Unauthorized");

        const parsedData = TutorController.parseFormData(req.body);

        const avatarFile = req.files && (req.files as any).avatar
            ? (req.files as any).avatar[0]
            : undefined;

        const certificationFiles = req.files && (req.files as any).certificationImages
            ? (req.files as any).certificationImages
            : [];

        const updatedTutor = await tutorService.updateTutorProfile(
            String(userId),
            parsedData,
            certificationFiles,
            avatarFile
        );

        new SuccessResponse({
            message: "Tutor profile updated successfully",
            metadata: updatedTutor,
        }).send(res);
    }

    async deleteCertificationImage(req: Request, res: Response) {
        const userId = req.user?._id;
        const { certificationIndex, imageIndex } = req.params;

        const tutor = await tutorService.getTutorByUserId(String(userId));
        if (!tutor) {
            return res.status(404).json({ message: "Tutor profile not found" });
        }

        const updatedTutor = await tutorService.deleteCertificationImage(
            (tutor._id as string | { toString(): string }).toString(),
            parseInt(certificationIndex),
            parseInt(imageIndex)
        );

        new SuccessResponse({
            message: "Certification image deleted successfully",
            metadata: updatedTutor
        }).send(res);
    }

    private static parseFormData(data: any): UpdateTutorInput {
        const parsed: any = { ...data };

        // Parse education if it's a string
        if (typeof parsed.education === 'string') {
            try {
                parsed.education = JSON.parse(parsed.education);
            } catch (error) {
                // Keep original if parsing fails
            }
        }

        // Parse certifications if it's a string
        if (typeof parsed.certifications === 'string') {
            try {
                parsed.certifications = JSON.parse(parsed.certifications);
            } catch (error) {
                // Keep original if parsing fails
            }
        }

        // Parse availability if it's a string
        if (typeof parsed.availability === 'string') {
            try {
                parsed.availability = JSON.parse(parsed.availability);
            } catch (error) {
                // Keep original if parsing fails
            }
        }

        // Parse numeric fields
        if (parsed.experienceYears !== undefined) {
            parsed.experienceYears = parseInt(parsed.experienceYears);
        }
        if (parsed.hourlyRate !== undefined) {
            parsed.hourlyRate = parseFloat(parsed.hourlyRate);
        }

        return parsed;
    }
}

export default new TutorController();