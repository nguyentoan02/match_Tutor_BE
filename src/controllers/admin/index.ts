import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../utils/error.response";

// Import all admin controllers
import adminBanController from "./admin.ban.controller";
import adminUserController from "./admin.user.controller";
import adminTutorController from "./admin.tutor.controller";

class AdminController {
   // User Ban Management
   banUser = adminBanController.banUser;
   unbanUser = adminBanController.unbanUser;
   getBannedUsers = adminBanController.getBannedUsers;
   getUserBanHistory = adminBanController.getUserBanHistory;

   // User Management
   getAllUsers = adminUserController.getAllUsers;
   getBannedTutors = adminUserController.getBannedTutors;
   getActiveTutors = adminUserController.getActiveTutors;
   getBannedStudents = adminUserController.getBannedStudents;
   getActiveStudents = adminUserController.getActiveStudents;

   // Tutor Management
   acceptTutor = adminTutorController.acceptTutor;
   rejectTutor = adminTutorController.rejectTutor;
   getPendingTutors = adminTutorController.getPendingTutors;
   getTutorProfile = adminTutorController.getTutorProfile;
   getTutorsWithMapping = adminTutorController.getTutorsWithMapping;
}

export default new AdminController();

