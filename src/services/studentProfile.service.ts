import { Types } from "mongoose";
import studentModel from "../models/student.model";
import userModel from "../models/user.model";
import { CreateStudentProfileBody } from "../schemas/StudentProfile.schema";
import { IStudent } from "../types/types/student";
import { UpdateStudentProfileBody } from "../schemas/StudentProfile.schema";
import cloudinary from "../config/cloudinary";
class StudentProfileService {
    async createProfile(
        userId: string,
        studentProfile: CreateStudentProfileBody,
        file?: Express.Multer.File
    ): Promise<IStudent> {
        const user = await userModel.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const existed = await studentModel.findOne({ userId });
        if (existed) {
            throw new Error("Student profile already exists");
        }

        let avatarUrl = studentProfile.avatarUrl;
        if (file) {
            try {
                let uploadResult: any = null;
                if ((file as any).buffer) {
                    const base64 = `data:${
                        file.mimetype
                    };base64,${file.buffer.toString("base64")}`;
                    uploadResult = await cloudinary.uploader.upload(base64, {
                        folder: "avatars",
                        resource_type: "image",
                    });
                } else if ((file as any).path) {
                    uploadResult = await cloudinary.uploader.upload(
                        (file as any).path,
                        {
                            folder: "avatars",
                            resource_type: "image",
                        }
                    );
                }
                if (uploadResult && uploadResult.secure_url) {
                    avatarUrl = uploadResult.secure_url;
                }
            } catch (err) {
                console.error("Avatar upload failed:", err);
            }
        }

        user.phone = studentProfile.phone;
        user.gender = studentProfile.gender;
        user.address = studentProfile.address;
        if (avatarUrl) user.avatarUrl = avatarUrl;
        await user.save();

        const {
            address,
            subjectsInterested,
            gradeLevel,
            bio,
            learningGoals,
            availability,
        } = studentProfile;

        const newProfile = await studentModel.create({
            userId: new Types.ObjectId(userId),
            address,
            subjectsInterested,
            gradeLevel,
            bio,
            learningGoals,
            availability,
        });

        return newProfile as IStudent;
    }

    async updateProfile(
        userId: string,
        updateStudentProfile: UpdateStudentProfileBody,
        file?: Express.Multer.File
    ): Promise<IStudent> {
        const user = await userModel.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        const existed = await studentModel.findOne({ userId });
        if (!existed) {
            throw new Error("Student profile hasn't been created yet");
        }

        let avatarUrl = updateStudentProfile.avatarUrl;
        if (file) {
            try {
                let uploadResult: any = null;
                if ((file as any).buffer) {
                    const base64 = `data:${
                        file.mimetype
                    };base64,${file.buffer.toString("base64")}`;
                    uploadResult = await cloudinary.uploader.upload(base64, {
                        folder: "avatars",
                        resource_type: "image",
                    });
                } else if ((file as any).path) {
                    uploadResult = await cloudinary.uploader.upload(
                        (file as any).path,
                        {
                            folder: "avatars",
                            resource_type: "image",
                        }
                    );
                }
                if (uploadResult && uploadResult.secure_url) {
                    avatarUrl = uploadResult.secure_url;
                }
            } catch (err) {
                console.error("Avatar upload failed:", err);
            }
        }

        if (updateStudentProfile.name !== undefined)
            user.name = updateStudentProfile.name;
        if (updateStudentProfile.phone !== undefined)
            user.phone = updateStudentProfile.phone;
        if (updateStudentProfile.gender !== undefined)
            user.gender = updateStudentProfile.gender;
        if (avatarUrl) user.avatarUrl = avatarUrl;
        if (updateStudentProfile.address !== undefined)
            user.address = updateStudentProfile.address;
        await user.save();

        const {
            address,
            subjectsInterested,
            gradeLevel,
            bio,
            learningGoals,
            availability,
        } = updateStudentProfile;

        const updateFields: any = {};
        if (address !== undefined) updateFields.address = address;
        if (subjectsInterested !== undefined)
            updateFields.subjectsInterested = subjectsInterested;
        if (gradeLevel !== undefined) updateFields.gradeLevel = gradeLevel;
        if (bio !== undefined) updateFields.bio = bio;
        if (learningGoals !== undefined)
            updateFields.learningGoals = learningGoals;
        if (availability !== undefined)
            updateFields.availability = availability;

        const updatedProfile = await studentModel
            .findOneAndUpdate({ userId }, { $set: updateFields }, { new: true })
            .populate({
                path: "userId",
                select: "address _id role name email avatarUrl gender phone isBanned isVerifiedEmail",
            });
        return updatedProfile as IStudent;
    }

    async getProfile(userId: string): Promise<{ student: IStudent | null }> {
        const studentProfile = await studentModel
            .findOne({ userId: userId })
            .populate({
                path: "userId",
                select: "_id role name email isBanned isVerifiedEmail avatarUrl gender phone address",
            });
        return { student: studentProfile as IStudent | null };
    }
}

export default new StudentProfileService();
