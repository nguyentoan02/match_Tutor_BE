import { Request, Response } from "express";
import { OK, SuccessResponse } from "../utils/success.response";
import tutorService from "../services/tutor.service";
import { UnauthorizedError } from "../utils/error.response";

export class TutorController {
    // Get all tutors
    async getAllTutors(req: Request, res: Response) {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 6;

        const result = await tutorService.getAllTutors(true, page, limit); // Chỉ lấy tutor đã được duyệt

        new SuccessResponse({
            message: "Danh sách gia sư đã được duyệt lấy thành công",
            metadata: result
        }).send(res);
    }

    // Get one tutor by ID
    async getTutorById(req: Request, res: Response) {
        const { id } = req.params;
        const tutor = await tutorService.getTutorById(id);

        new SuccessResponse({
            message: "Thông tin gia sư lấy thành công",
            metadata: tutor
        }).send(res);
    }

    // Get tutor by user ID (for current user's tutor profile)
    async getMyTutorProfile(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Chưa đăng nhập");
        }
        const tutor = await tutorService.getTutorByUserId(String(currentUser._id));

        if (!tutor) {
            return res.status(404).json({ message: "Không tìm thấy hồ sơ gia sư" });
        }

        new SuccessResponse({
            message: "Hồ sơ gia sư lấy thành công",
            metadata: tutor
        }).send(res);
    }

    // Search tutors
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
                return res.status(400).json({ message: "Định dạng availability không hợp lệ. Phải là JSON." });
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
            message: "Kết quả tìm kiếm gia sư",
            metadata: result,
        }).send(res);
    }

    async createTutorProfile(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Chưa đăng nhập");
        }

        const avatarFile = req.files && (req.files as any).avatar
            ? (req.files as any).avatar[0]
            : undefined;

        const certificationFiles = req.files && (req.files as any).certificationImages
            ? (req.files as any).certificationImages
            : [];

        const imageCertMapping = (req.body as any).imageCertMapping;

        const newTutor = await tutorService.createTutorProfile(
            String(currentUser._id),
            {
                ...req.body,
                imageCertMapping
            },
            avatarFile,
            certificationFiles
        );

        new SuccessResponse({
            message: "Tạo hồ sơ gia sư thành công",
            metadata: newTutor,
        }).send(res);
    }

    async updateTutorProfile(req: Request, res: Response) {
        const userId = req.user?._id;
        if (!userId) throw new UnauthorizedError("Chưa đăng nhập");

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
            message: "Cập nhật hồ sơ gia sư thành công",
            metadata: updatedTutor,
        }).send(res);
    }

    async deleteCertificationImage(req: Request, res: Response) {
        const userId = req.user?._id;
        const { certificationIndex, imageIndex } = req.params;

        const tutor = await tutorService.getTutorByUserId(String(userId));
        if (!tutor) {
            return res.status(404).json({ message: "Không tìm thấy hồ sơ gia sư" });
        }

        const updatedTutor = await tutorService.deleteCertificationImage(
            (tutor._id as string | { toString(): string }).toString(),
            parseInt(certificationIndex),
            parseInt(imageIndex)
        );

        new SuccessResponse({
            message: "Xóa hình chứng chỉ thành công",
            metadata: updatedTutor
        }).send(res);
    }

    async updateAllAvailTime(req:Request,res:Response) {
        const result = await tutorService.updateAllTutor()
        new OK({
            message: "oke",
            metadata: result
        }).send(res)
    }

    async getSuggestion(req:Request, res:Response) {
        const currentUser = req.user;
        console.log(req.user)
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
        }
        const result = await tutorService.getSuggestions(currentUser._id.toString());
        new OK({
            message: "ok",
            metadata:result
        }).send(res)
    }
}

export default new TutorController();
