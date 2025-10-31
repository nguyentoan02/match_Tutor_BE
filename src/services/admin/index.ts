// Import all admin services
import adminBanService from "./admin.ban.service";
import adminUserService from "./admin.user.service";
import adminTutorService from "./admin.tutor.service";
import adminStatisticsService from "./admin.statistics.service";

class AdminService {
   // User Ban Management
   banUser = adminBanService.banUser;
   unbanUser = adminBanService.unbanUser;
   getBannedUsers = adminBanService.getBannedUsers;
   getUserBanHistory = adminBanService.getUserBanHistory;

   // User Management
   getAllUsers = adminUserService.getAllUsers;
   getActiveUsers = adminUserService.getActiveUsers;
   getBannedUsersList = adminUserService.getBannedUsersList;
   getBannedTutors = adminUserService.getBannedTutors;
   getActiveTutors = adminUserService.getActiveTutors;
   getBannedStudents = adminUserService.getBannedStudents;
   getActiveStudents = adminUserService.getActiveStudents;

   // Tutor Management
   acceptTutor = adminTutorService.acceptTutor;
   rejectTutor = adminTutorService.rejectTutor;
   getPendingTutors = adminTutorService.getPendingTutors;

   // Statistics
   getUserStatistics = adminStatisticsService.getUserStatistics;

   // Tutor Package Management - Import từ adminUserService
   createTutorPackage = adminUserService.createTutorPackage;
   getAllTutorPackages = adminUserService.getAllTutorPackages;
   getTutorPackageById = adminUserService.getTutorPackageById;
   updateTutorPackage = adminUserService.updateTutorPackage;
   deleteTutorPackage = adminUserService.deleteTutorPackage;
   getTutorPackageStats = adminUserService.getTutorPackageStats;
   getTutorsUsingPackage = adminUserService.getTutorsUsingPackage;
}

export default new AdminService();