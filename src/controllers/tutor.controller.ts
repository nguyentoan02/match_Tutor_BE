import { Request, Response } from "express";
import { SuccessResponse } from "../utils/success.response";
import tutorService from "../services/tutor.service";
import { CreateTutorInput, UpdateTutorInput } from "../schemas/tutor.schema";
import { UnauthorizedError } from "../utils/error.response";

export class TutorController {
    // Get all tutors
    async getAllTutors(req: Request, res: Response) {
        const tutors = await tutorService.getAllTutors(true); // Chỉ lấy tutor đã được duyệt

        new SuccessResponse({
            message: "All tutors retrieved successfully",
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


        const avatarFile = req.files && (req.files as any).avatar
            ? (req.files as any).avatar[0]
            : undefined;

        const certificationFiles = req.files && (req.files as any).certificationImages
            ? (req.files as any).certificationImages
            : [];


        const newTutor = await tutorService.createTutorProfile(
            String(currentUser._id),
            req.body as CreateTutorInput,
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

        const updatedTutor = await tutorService.updateTutorProfile(
            String(userId),
            req.body,
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