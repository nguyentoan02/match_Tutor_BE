import { Types } from "mongoose";
import studentModel from "../models/student.model";
import userModel from "../models/user.model";
import { CreateStudentProfileBody } from "../schemas/StudentProfile.schema";
import { IStudent } from "../types/types/student";
import { UpdateStudentProfileBody } from "../schemas/StudentProfile.schema";
class StudentProfileService {
    async createProfile(
        userId: string,
        studentProfile: CreateStudentProfileBody
    ): Promise<IStudent> {
        const user = await userModel.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }

        const existed = await studentModel.findOne({ userId });
        if (existed) {
            throw new Error("Student profile already exists");
        }

        const newProfile = await studentModel.create({
            userId: new Types.ObjectId(userId),
            ...studentProfile,
        });

        return newProfile as IStudent;
    }

    async updateProfile(
        userId: string,
        updateStudentProfile: UpdateStudentProfileBody
    ): Promise<IStudent> {
        const user = await userModel.findById(userId);
        if (!user) {
            throw new Error("User not found");
        }
        const existed = await studentModel.findOne({ userId });
        if (!existed) {
            throw new Error("Student profile hasn't been created yet");
        }
        const updatedProfile = await studentModel.findOneAndUpdate(
            { userId },
            { $set: updateStudentProfile },
            { new: true }
        );
        return updatedProfile as IStudent;
    }

    async getProfile(userId: string): Promise<{ student: IStudent | null }> {
        const studentProfile = await studentModel
            .findOne({ userId: userId })
            .populate({
                path: "userId",
                select: "_id role name email isBanned isVerifiedEmail",
            });
        return { student: studentProfile as IStudent | null };
    }
}

export default new StudentProfileService();
