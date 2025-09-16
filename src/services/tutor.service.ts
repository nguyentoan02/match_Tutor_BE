import { FilterQuery, Types } from "mongoose";
import Tutor from "../models/tutor.model";
import { CreateTutorInput, UpdateTutorInput } from "../schemas/tutor.schema";
import { NotFoundError } from "../utils/error.response";
import { ITutor } from "../types/types/tutor";
import cloudinary from "../config/cloudinary";
import userService from "./user.service";

export class TutorService {
    // Get all tutors (approved and unapproved)
    async getAllTutors(
        isApproved?: boolean,
        page: number = 1,
        limit: number = 6
    ): Promise<{ data: ITutor[]; pagination: any }> {
        const filter: FilterQuery<ITutor> = {};
        const skip = (page - 1) * limit;

        // Add approval filter if provided
        if (isApproved !== undefined) {
            filter.isApproved = isApproved;
        }

        const tutors = await Tutor.find(filter)
            .populate('userId', 'name email avatarUrl phone gender address')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Tutor.countDocuments(filter);

        return {
            data: tutors,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
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
        data: CreateTutorInput & { imageCertMapping?: any }, // Add mapping type
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

        // 🔹 2. Handle certification images upload WITH MAPPING
        let certifications = data.certifications || [];

        // console.log("Files received:", certificationFiles ? certificationFiles.map(f => f.originalname) : []);
        // console.log("Mapping received:", data.imageCertMapping);

        if (certificationFiles && certificationFiles.length > 0) {
            const uploadedImageUrls = await this.uploadCertificationImages(certificationFiles);

            // Parse mapping information
            let mapping: Array<{ certIndex: number; fileIndex: number }> = [];
            try {
                mapping = typeof data.imageCertMapping === 'string'
                    ? JSON.parse(data.imageCertMapping)
                    : data.imageCertMapping || [];
            } catch (error) {
                console.error('Error parsing imageCertMapping:', error);
            }

            // Initialize all certifications with empty image arrays
            certifications = certifications.map(cert => ({
                ...cert,
                imageUrls: []
            }));

            // Apply mapping to assign images to correct certifications
            mapping.forEach((map) => {
                const { certIndex, fileIndex } = map;
                if (certifications[certIndex] && uploadedImageUrls[fileIndex]) {
                    certifications[certIndex].imageUrls.push(uploadedImageUrls[fileIndex]);
                }
            });

            // 🔹 Fallback: If no mapping, distribute images evenly
            if (mapping.length === 0) {
                const imagesPerCert = Math.ceil(uploadedImageUrls.length / certifications.length);

                certifications = certifications.map((cert, index) => {
                    const startIndex = index * imagesPerCert;
                    const endIndex = startIndex + imagesPerCert;
                    const certImages = uploadedImageUrls.slice(startIndex, endIndex).filter(url => url);

                    return {
                        ...cert,
                        imageUrls: certImages
                    };
                });
            }
        } else {
            // No files, just ensure imageUrls array exists
            certifications = certifications.map(cert => ({
                ...cert,
                imageUrls: []
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
        data: Partial<UpdateTutorInput> & { imageCertMapping?: any }, // Add mapping type
        certificationFiles?: Express.Multer.File[],
        avatarFile?: Express.Multer.File
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

        // console.log("Files received:", certificationFiles ? certificationFiles.map(f => f.originalname) : []);
        // console.log("Mapping received:", data.imageCertMapping);

        if (data.certifications !== undefined) {
            let updatedCertifications = [...(tutor.certifications || [])];

            // Update text fields for CURRENT certifications only
            data.certifications.forEach((newCert: any, index: number) => {
                if (updatedCertifications[index]) {
                    updatedCertifications[index] = {
                        ...updatedCertifications[index],
                        name: newCert.name,
                        description: newCert.description
                    };
                } else {
                    updatedCertifications[index] = {
                        name: newCert.name,
                        description: newCert.description,
                        imageUrls: []
                    };
                }
            });

            // Handle file uploads with SAFE mapping
            if (certificationFiles && certificationFiles.length > 0) {
                const uploadedImageUrls = await this.uploadCertificationImages(certificationFiles);

                // Parse mapping with error handling
                let mapping: Array<{ certIndex: number; fileIndex: number }> = [];
                try {
                    mapping = typeof data.imageCertMapping === 'string'
                        ? JSON.parse(data.imageCertMapping)
                        : data.imageCertMapping || [];
                } catch (error) {
                    console.error('Error parsing imageCertMapping:', error);
                }

                // 🔹 SAFETY CHECK: Validate mapping before applying
                const validMapping = mapping.filter(map => {
                    // Check if certification index exists in FINAL array
                    const certExists = map.certIndex >= 0 && map.certIndex < updatedCertifications.length;

                    // Check if file index exists in uploaded files
                    const fileExists = map.fileIndex >= 0 && map.fileIndex < uploadedImageUrls.length;

                    if (!certExists) {
                        console.warn(`Mapping error: Certification index ${map.certIndex} does not exist`);
                    }
                    if (!fileExists) {
                        console.warn(`Mapping error: File index ${map.fileIndex} does not exist`);
                    }

                    return certExists && fileExists;
                });

                // Apply only valid mapping
                validMapping.forEach((map) => {
                    const { certIndex, fileIndex } = map;
                    if (
                        uploadedImageUrls[fileIndex] &&
                        updatedCertifications[certIndex] &&
                        Array.isArray(updatedCertifications[certIndex].imageUrls)
                    ) {
                        updatedCertifications[certIndex].imageUrls.push(uploadedImageUrls[fileIndex]);
                    }
                });
            }

            // If data.certifications has fewer items than updatedCertifications, truncate the array
            if (data.certifications.length < updatedCertifications.length) {
                updatedCertifications = updatedCertifications.slice(0, data.certifications.length);
            }

            tutor.certifications = updatedCertifications as any;
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