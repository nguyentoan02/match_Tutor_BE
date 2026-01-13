import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../utils/error.response";

// Import all admin controllers
import adminBanController from "./admin.ban.controller";
import adminUserController from "./admin.user.controller";
import adminTutorController from "./admin.tutor.controller";
import adminTutorDetailsController from "./admin.tutor.details.controller";
import adminTutorPackageController from "./admin.tutorPackage.controller";
import adminDashboardController from "./admin.dashboard.controller";
import adminRevenueController from "./admin.revenue.controller";
import adminTransactionController from "./admin.transaction.controller";
import adminReviewController from "./admin.review.controller";

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
   hideTutor = adminTutorController.hideTutor;
   getPendingTutors = adminTutorController.getPendingTutors;
   getTutorProfile = adminTutorController.getTutorProfile;
   getTutorsWithMapping = adminTutorController.getTutorsWithMapping;

   // Tutor Details Management
   getTutorFullDetails = adminTutorDetailsController.getTutorFullDetails;
   getTutorLearningCommitments = adminTutorDetailsController.getTutorLearningCommitments;
   getTutorSessions = adminTutorDetailsController.getTutorSessions;
   getTutorTeachingRequests = adminTutorDetailsController.getTutorTeachingRequests;
   getTutorViolationReports = adminTutorDetailsController.getTutorViolationReports;
   getTutorReviews = adminTutorDetailsController.getTutorReviews;
   getTutorStatistics = adminTutorDetailsController.getTutorStatistics;
   getReviewVisibilityRequests = adminReviewController.getVisibilityRequests;
   handleReviewVisibilityRequest = adminReviewController.handleVisibilityRequest;

   // Tutor Package Management
   createTutorPackage = adminTutorPackageController.createTutorPackage;
   getAllTutorPackages = adminTutorPackageController.getAllTutorPackages;
   getTutorPackageById = adminTutorPackageController.getTutorPackageById;
   updateTutorPackage = adminTutorPackageController.updateTutorPackage;
   updateTutorPackageStatus = adminTutorPackageController.updateTutorPackageStatus;
   getTutorPackageStats = adminTutorPackageController.getTutorPackageStats;
   getTutorsUsingPackage = adminTutorPackageController.getTutorsUsingPackage;

   // Dashboard
   getDashboardSummary = adminDashboardController.getSummary;

   // Revenue
   getAdminRevenue = adminRevenueController.getAdminRevenue;

   // Transactions
   getTransactionHistory = adminTransactionController.getTransactionHistory;
   getPackageTransactions = adminTransactionController.getPackageTransactions;
   getCommitmentTransactions = adminTransactionController.getCommitmentTransactions;
   getAdminWalletBalance = adminTransactionController.getAdminWalletBalance;
}

export default new AdminController();

