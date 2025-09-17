import { FilterQuery, Types } from "mongoose";
import Tutor from "../models/tutor.model";
import { CreateTutorInput, UpdateTutorInput } from "../schemas/tutor.schema";
import { NotFoundError } from "../utils/error.response";
import { ICertification, ITutor } from "../types/types/tutor";
import cloudinary from "../config/cloudinary";
import userService from "./user.service";
import { Level, Subject, TimeSlot } from "../types/enums";

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
        data: Partial<UpdateTutorInput> & { imageCertMapping?: any },
        certificationFiles?: Express.Multer.File[],
        avatarFile?: Express.Multer.File
    ): Promise<ITutor> {
        const tutor = await Tutor.findOne({ userId: new Types.ObjectId(userId) });

        if (!tutor) {
            throw new NotFoundError("Tutor profile not found");
        }

        // 🔹 1. Sync user profile
        await userService.updateProfile(userId, {
            name: (data as any).name,
            phone: (data as any).phone,
            gender: (data as any).gender,
            address: (data as any).address,
        }, avatarFile);

        // 🔹 2. Update all tutor fields except certifications (handled separately)
        if (data.subjects) {
            tutor.subjects = data.subjects.map(s => s as Subject);
        }
        if (data.levels) {
            tutor.levels = data.levels.map(l => l as Level);
        }
        if (data.classType) tutor.classType = data.classType;
        if (data.education) tutor.education = data.education;
        if (data.experienceYears !== undefined) tutor.experienceYears = data.experienceYears;
        if (data.hourlyRate !== undefined) tutor.hourlyRate = data.hourlyRate;
        if (data.bio) tutor.bio = data.bio;
        if (data.classType) tutor.classType = data.classType;
        if (data.availability) {
            tutor.availability = data.availability.map(day => ({
                dayOfWeek: day.dayOfWeek,
                slots: day.slots?.map(slot => slot as TimeSlot) || []
            }));
        }

        // Start with empty array and rebuild completely
        let updatedCertifications: ICertification[] = [];

        // Map to track temporary IDs to actual certifications
        const tempIdToCertMap: { [key: string]: ICertification } = {};

        // Rebuild certifications array from scratch
        if (Array.isArray(data.certifications)) {
            data.certifications.forEach((newCert, index) => {
                if (newCert._id) {
                    // Find existing certification in the original tutor data
                    const existingCert = tutor.certifications?.find(c =>
                        c._id && c._id.toString() === newCert._id
                    );

                    if (existingCert) {
                        // Update existing certification
                        updatedCertifications.push({
                            _id: existingCert._id, // Keep original ID
                            name: newCert.name,
                            description: newCert.description,
                            imageUrls: [...(existingCert.imageUrls || [])] // Copy existing images
                        });
                    } else {
                        // Create new certification with the provided ID (shouldn't happen normally)
                        updatedCertifications.push({
                            _id: new Types.ObjectId(newCert._id),
                            name: newCert.name,
                            description: newCert.description,
                            imageUrls: []
                        });
                    }
                } else {
                    // Add new certification with temporary ID tracking
                    const newCertObj: ICertification = {
                        _id: new Types.ObjectId(),
                        name: newCert.name,
                        description: newCert.description,
                        imageUrls: []
                    };

                    updatedCertifications.push(newCertObj);

                    // Store mapping from temporary ID (if provided) to actual certification
                    if (newCert.tempId) {
                        tempIdToCertMap[newCert.tempId] = newCertObj;
                    }

                    // Also map by index as fallback
                    tempIdToCertMap[`index_${index}`] = newCertObj;
                }
            });
        }

        // Handle image uploads and mapping
        if (certificationFiles && certificationFiles.length > 0) {
            const uploadedImageUrls = await this.uploadCertificationImages(certificationFiles);

            let mapping: Array<{
                certId?: string;
                tempCertId?: string;
                fileIndex?: number;
                imageIndex?: number;
                action: "add" | "remove";
            }> = [];

            try {
                mapping = typeof data.imageCertMapping === "string"
                    ? JSON.parse(data.imageCertMapping)
                    : data.imageCertMapping || [];
            } catch (error) {
                console.error("Error parsing imageCertMapping:", error);
            }

            console.log("Processing image mapping:", mapping);
            console.log("Available certifications:", updatedCertifications.map(c => ({
                _id: c._id?.toString(),
                name: c.name
            })));

            mapping.forEach((map) => {
                let cert: ICertification | undefined;

                // First try to find by existing certId
                if (map.certId) {
                    cert = updatedCertifications.find(c =>
                        c._id && c._id.toString() === map.certId
                    );
                    console.log(`Looking for certId ${map.certId}:`, cert ? "FOUND" : "NOT FOUND");
                }

                // If not found, try to find by temporary certId for new certifications
                if (!cert && map.tempCertId) {
                    cert = tempIdToCertMap[map.tempCertId];
                    console.log(`Looking for tempCertId ${map.tempCertId}:`, cert ? "FOUND" : "NOT FOUND");
                }

                if (!cert) {
                    console.warn("Could not find certification for mapping:", map);
                    return;
                }

                if (!Array.isArray(cert.imageUrls)) {
                    cert.imageUrls = [];
                }

                switch (map.action) {
                    case "add":
                        if (map.fileIndex !== undefined && uploadedImageUrls[map.fileIndex]) {
                            cert.imageUrls.push(uploadedImageUrls[map.fileIndex]);
                            console.log(`Added image to cert ${cert.name}: ${uploadedImageUrls[map.fileIndex]}`);
                        }
                        break;

                    case "remove":
                        if (map.imageIndex !== undefined && cert.imageUrls[map.imageIndex] !== undefined) {
                            const removedUrl = cert.imageUrls[map.imageIndex];
                            cert.imageUrls.splice(map.imageIndex, 1);
                            console.log(`Removed image from cert ${cert.name}: ${removedUrl}`);
                        }
                        break;
                }
            });
        }

        // Update certifications field
        if (Array.isArray(data.certifications)) {
            // Convert ObjectId to string for consistency with the interface
            const processedCerts = updatedCertifications.map(cert => ({
                ...cert,
                _id: cert._id ? cert._id.toString() : undefined
            }));
            tutor.certifications = processedCerts as any;
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