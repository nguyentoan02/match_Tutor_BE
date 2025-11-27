import { Router } from "express";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums/role.enum";
import { validate } from "../middlewares/validation.middleware";
import adminController from "../controllers/admin";
import {
   banUserSchema,
   unbanUserSchema,
   getBannedUsersSchema,
   getUserBanHistorySchema,
   getBannedTutorsSchema,
   getActiveTutorsSchema,
   getBannedStudentsSchema,
   getActiveStudentsSchema,
   acceptTutorSchema,
   rejectTutorSchema,
   getPendingTutorsSchema,
   createPackageSchema,
   updatePackageSchema,
   listPackagesSchema,
   getPackageByIdSchema,
   getTutorsUsingPackageSchema,
   updatePackageStatusSchema,
   getTransactionHistorySchema,
} from "../schemas/admin.schema";

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(isRole(Role.ADMIN));

// ========== DASHBOARD ==========
router.get("/dashboard/summary", adminController.getDashboardSummary);

// ========== REVENUE ==========
router.get("/revenue", adminController.getAdminRevenue);

// ========== TRANSACTION HISTORY ==========
router.get(
   "/transactions",
   validate(getTransactionHistorySchema),
   adminController.getTransactionHistory
);
router.get(
   "/transactions/packages",
   validate(getTransactionHistorySchema),
   adminController.getPackageTransactions
);
router.get(
   "/wallet/balance",
   validate(getAdminWalletBalanceSchema),
   adminController.getAdminWalletBalance
);

// ========== BAN MANAGEMENT ==========
router.post("/user/:id/ban", validate(banUserSchema), adminController.banUser);
router.post(
   "/user/:id/unban",
   validate(unbanUserSchema),
   adminController.unbanUser
);
router.get(
   "/user/banned",
   validate(getBannedUsersSchema),
   adminController.getBannedUsers
);
router.get(
   "/user/:id/ban-history",
   validate(getUserBanHistorySchema),
   adminController.getUserBanHistory
);

// ========== USER MANAGEMENT ==========
router.get("/users", adminController.getAllUsers);
router.get(
   "/tutors/banned",
   validate(getBannedTutorsSchema),
   adminController.getBannedTutors
);
router.get(
   "/tutors/active",
   validate(getActiveTutorsSchema),
   adminController.getActiveTutors
);
router.get(
   "/students/banned",
   validate(getBannedStudentsSchema),
   adminController.getBannedStudents
);
router.get(
   "/students/active",
   validate(getActiveStudentsSchema),
   adminController.getActiveStudents
);

// ========== TUTOR MANAGEMENT ==========
router.post(
   "/tutor/:id/accept",
   validate(acceptTutorSchema),
   adminController.acceptTutor
);
router.post(
   "/tutor/:id/reject",
   validate(rejectTutorSchema),
   adminController.rejectTutor
);
router.get(
   "/tutors/pending",
   validate(getPendingTutorsSchema),
   adminController.getPendingTutors
);
router.get("/tutors/mapping", adminController.getTutorsWithMapping);
router.get("/tutor/:id", adminController.getTutorProfile);

// ========== PACKAGE MANAGEMENT ==========
// New preferred routes
router.post("/packages", validate(createPackageSchema), adminController.createTutorPackage);
router.get("/packages", validate(listPackagesSchema), adminController.getAllTutorPackages);
router.get("/packages/stats", adminController.getTutorPackageStats);
// Routes với path cụ thể phải đặt trước route /packages/:id
router.patch("/packages/:id/status", validate(updatePackageStatusSchema), adminController.updateTutorPackageStatus);
router.get("/packages/:id/tutors", validate(getTutorsUsingPackageSchema), adminController.getTutorsUsingPackage);
// Routes generic
router.get("/packages/:id", validate(getPackageByIdSchema), adminController.getTutorPackageById);
router.put("/packages/:id", validate(updatePackageSchema), adminController.updateTutorPackage);


export default router;
