import { FilterQuery, Types } from "mongoose";
import Tutor from "../models/tutor.model";
import { CreateTutorInput, UpdateTutorInput } from "../schemas/tutor.schema";
import { NotFoundError } from "../utils/error.response";
import { ITutor } from "../types/types/tutor";
import cloudinary from "../config/cloudinary";
import userService from "./user.service";

export class TutorService {
    // Get all tutors (approved and unapproved)
    async getAllTutors(isApproved?: boolean): Promise<ITutor[]> {
        const filter: FilterQuery<ITutor> = {};

        // Add approval filter if provided
        if (isApproved !== undefined) {
            filter.isApproved = isApproved;
        }

        return await Tutor.find(filter)
            .populate('userId', 'name email avatarUrl phone gender address')
            .lean();
    }
    // Get one tutor by tutor ID
    async getTutorById(tutorId: string): Promise<ITutor> {
        const tutor = await Tutor.findById(tutorId)
            .populate('userId', 'name email avatarUrl phone gender address')
            .lean();

        if (!tutor) {
            throw new NotFoundError("Tutor not found");
        }

        return tutor;
    }

    // Get one tutor by user ID
    async getTutorByUserId(userId: string): Promise<ITutor | null> {
        return await Tutor.findOne({ userId: new Types.ObjectId(userId) })
            .populate('userId', 'name email avatarUrl phone gender address')
            .lean();
    }

    async createTutorProfile(
        userId: string,
        data: CreateTutorInput,
        avatarFile?: Express.Multer.File,
        certificationFiles?: Express.Multer.File[]
    ): Promise<ITutor> {
        // Check if tutor profile already exists
        const existingTutor = await Tutor.findOne({ userId: new Types.ObjectId(userId) });
        if (existingTutor) {
            throw new Error("Tutor profile already exists");
        }
        // 🔹 1. Update user profile (basic fields + avatar)
        await userService.updateProfile(userId, {
            name: (data as any).name,
            phone: (data as any).phone,
            gender: (data as any).gender,
            address: (data as any).address,
        }, avatarFile);

        // 🔹 2. Handle certification images upload
        let certifications = data.certifications || [];
        if (certificationFiles && certificationFiles.length > 0) {
            const uploadedImageUrls = await this.uploadCertificationImages(certificationFiles);

            certifications = certifications.map((cert: { name: string; description?: string }, index: number) => ({
                name: cert.name,
                description: cert.description,
                imageUrls: uploadedImageUrls[index] ? [uploadedImageUrls[index]] : []
            }));
        }

        // 🔹 3. Create tutor profile
        const tutor = new Tutor({
            userId,
            subjects: data.subjects,
            levels: data.levels,
            education: data.education,
            certifications,
            experienceYears: data.experienceYears,
            hourlyRate: data.hourlyRate,
            bio: data.bio,
            classType: data.classType,
            availability: data.availability,
        });

        await tutor.save();

        return await Tutor.findById(tutor._id)
            .populate("userId", "name email avatarUrl phone gender")
            .lean() as ITutor;
    }

    async updateTutorProfile(
        userId: string,
        data: Partial<UpdateTutorInput>,
        certificationFiles?: Express.Multer.File[],
        avatarFile?: Express.Multer.File // new param for profile avatar
    ): Promise<ITutor> {
        const tutor = await Tutor.findOne({ userId: new Types.ObjectId(userId) });

        if (!tutor) {
            throw new NotFoundError("Tutor profile not found");
        }

        // 🔹 1. Sync user profile (avatar + basic fields)
        await userService.updateProfile(userId, {
            name: (data as any).name,
            phone: (data as any).phone,
            gender: (data as any).gender,
            address: (data as any).address,
        }, avatarFile);

        // 🔹 2. Update tutor-specific fields
        if (data.subjects !== undefined) tutor.subjects = data.subjects as any;
        if (data.levels !== undefined) tutor.levels = data.levels as any;
        if (data.experienceYears !== undefined) tutor.experienceYears = data.experienceYears;
        if (data.hourlyRate !== undefined) tutor.hourlyRate = data.hourlyRate;
        if (data.bio !== undefined) tutor.bio = data.bio;
        if (data.classType !== undefined) tutor.classType = data.classType as any;

        // 🔹 Education
        if (data.education !== undefined) {
            tutor.education = data.education.map((edu: any) => ({
                institution: edu.institution,
                degree: edu.degree,
                fieldOfStudy: edu.fieldOfStudy,
                startDate: edu.startDate,
                endDate: edu.endDate,
                description: edu.description
            })) as any;
        }

        // 🔹 Availability
        if (data.availability !== undefined) {
            tutor.availability = data.availability as any;
        }

        // 🔹 Certifications
        if (certificationFiles && certificationFiles.length > 0) {
            const uploadedImageUrls = await this.uploadCertificationImages(certificationFiles);

            if (!tutor.certifications) {
                tutor.certifications = [];
            }

            const newCertifications = (data.certifications || []).map(
                (cert: { name: string; description?: string }, index: number) => ({
                    name: cert.name,
                    description: cert.description,
                    imageUrls: uploadedImageUrls[index] ? [uploadedImageUrls[index]] : []
                })
            );

            tutor.certifications = [...tutor.certifications, ...newCertifications] as any;
        } else if (data.certifications !== undefined) {
            tutor.certifications = data.certifications.map((cert: any) => ({
                name: cert.name,
                description: cert.description,
                imageUrls: cert.imageUrls || []
            })) as any;
        }

        await tutor.save();

        return await Tutor.findById(tutor._id)
            .populate("userId", "email name avatarUrl phone gender")
            .lean() as ITutor;
    }

    private async uploadCertificationImages(files: Express.Multer.File[]): Promise<string[]> {
        const uploadPromises = files.map(async (file) => {
            try {
                let uploadResult: any = null;

                if ((file as any).buffer) {
                    const base64 = `data:${file.mimetype};base64,${file.buffer.toString("base64")}`;
                    uploadResult = await cloudinary.uploader.upload(base64, {
                        folder: "tutor-certifications",
                        resource_type: "image",
                    });
                } else if ((file as any).path) {
                    uploadResult = await cloudinary.uploader.upload((file as any).path, {
                        folder: "tutor-certifications",
                        resource_type: "image",
                    });
                }

                return uploadResult?.secure_url || "";
            } catch (err) {
                console.error("Certification image upload failed:", err);
                return "";
            }
        });

        return Promise.all(uploadPromises);
    }

    async deleteCertificationImage(tutorId: string, certificationIndex: number, imageIndex: number): Promise<ITutor> {
        const tutor = await Tutor.findById(tutorId);

        if (!tutor || !tutor.certifications || !tutor.certifications[certificationIndex]) {
            throw new NotFoundError("Certification or image not found");
        }

        const certification = tutor.certifications[certificationIndex];
        if (certification.imageUrls && certification.imageUrls[imageIndex]) {
            // Optional: Delete from Cloudinary here if needed
            certification.imageUrls.splice(imageIndex, 1);
        }

        await tutor.save();
        return tutor as ITutor;
    }
}

export default new TutorService();