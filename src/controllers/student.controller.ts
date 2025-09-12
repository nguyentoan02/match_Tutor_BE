import { NextFunction, Request, Response } from "express";
import { OK } from "../utils/success.response";
import { CreateStudentProfileBody } from "../schemas/StudentProfile.schema";
import { getVietnamTime } from "../utils/date.util";
import studentProfileService from "../services/studentProfile.service";
import { UnauthorizedError } from "../utils/error.response";
class StudentController {
   //TODO: after register, student must create their profile.
   async createProfile(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }
         const existed = await studentProfileService.getProfile(
            currentUser._id.toString()
         );
         if (existed.student) {
            return res
               .status(400)
               .json({ message: "Student profile already exists" });
         }
         const studentProfileData: CreateStudentProfileBody = req.body;
         const file = req.file;
         const createdProfile = await studentProfileService.createProfile(
            currentUser._id.toString(),
            studentProfileData,
            file
         );
         new OK({
            message: "Student profile created successfully",
            metadata: createdProfile,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
   //TODO: read student user Profile.
   async readUserProile(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }
         const studentProfile = await studentProfileService.getProfile(
            currentUser._id.toString()
         );
         if (!studentProfile.student) {
            return res.status(404).json({
               message:
                  "Student profile not found. Please create your profile first.",
            });
         }
         new OK({
            message: "Student profile fetched successfully",
            metadata: studentProfile,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async updateUserProfile(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }
         const existed = await studentProfileService.getProfile(
            currentUser._id.toString()
         );
         if (!existed.student) {
            return res.status(404).json({
               message:
                  "Student profile not found. Please create your profile first.",
            });
         }
         const updateData = req.body;
         const file = req.file; // Lấy file từ middleware upload
         const updatedProfile = await studentProfileService.updateProfile(
            currentUser._id.toString(),
            updateData,
            file
         );

         new OK({
            message: "Student profile updated successfully",
            metadata: updatedProfile,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new StudentController();
