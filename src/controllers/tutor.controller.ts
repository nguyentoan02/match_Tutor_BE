import { Request, Response } from "express";
import { SuccessResponse } from "../utils/success.response";
import tutorService from "../services/tutor.service";
import { CreateTutorInput, UpdateTutorInput } from "../schemas/tutor.schema";
import { UnauthorizedError } from "../utils/error.response";

export class TutorController {
    // Get all tutors
    async getAllTutors(req: Request, res: Response) {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 6;

        const result = await tutorService.getAllTutors(true, page, limit); // Chỉ lấy tutor đã được duyệt

        new SuccessResponse({
            message: "Approved tutors retrieved successfully",
            metadata: result
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
    //hello search
    async searchTutors(req: Request, res: Response) {
        const { keyword, subjects, levels, cities, minRate, maxRate, minExperience, maxExperience, classType, availability, minRating, maxRating } = req.query;

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 6;

        const filters: any = {};

        if (subjects) filters.subjects = (subjects as string).split(",");
        if (levels) filters.levels = (levels as string).split(",");
        if (cities) filters.cities = (cities as string).split(",");
        if (minRate) filters.minRate = parseFloat(minRate as string);
        if (maxRate) filters.maxRate = parseFloat(maxRate as string);
        if (minExperience) filters.minExperience = parseInt(minExperience as string);
        if (maxExperience) filters.maxExperience = parseInt(maxExperience as string);
        if (classType) filters.classType = (classType as string).split(",");
        if (availability) {
            try {
                filters.availability = JSON.parse(availability as string);
            } catch (e) {
                return res.status(400).json({ message: "Invalid availability format. Must be JSON." });
            }
        }
        if (minRating) filters.minRating = parseFloat(minRating as string);
        if (maxRating) filters.maxRating = parseFloat(maxRating as string);

        const result = await tutorService.searchTutors(
            keyword as string,
            filters,
            page,
            limit
        );

        new SuccessResponse({
            message: "Tutors search results",
            metadata: result,
        }).send(res);
    }

    async createTutorProfile(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
        }

        const avatarFile = req.files && (req.files as any).avatar
            ? (req.files as any).avatar[0]
            : undefined;

        const certificationFiles = req.files && (req.files as any).certificationImages
            ? (req.files as any).certificationImages
            : [];

        // Extract mapping from body
        const imageCertMapping = (req.body as any).imageCertMapping;

        const newTutor = await tutorService.createTutorProfile(
            String(currentUser._id),
            {
                ...req.body,
                imageCertMapping // Pass mapping to service
            },
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


        const avatarFile = req.files && (req.files as any).avatar
            ? (req.files as any).avatar[0]
            : undefined;

        const certificationFiles = req.files && (req.files as any).certificationImages
            ? (req.files as any).certificationImages
            : [];

        const imageCertMapping = (req.body as any).imageCertMapping;

        const updatedTutor = await tutorService.updateTutorProfile(
            String(userId),
            {
                ...req.body,
                imageCertMapping,
            },
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

}

export default new TutorController();
