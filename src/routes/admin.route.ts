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
   getPendingTutorsSchema
} from "../schemas/admin.schema";

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(isRole(Role.ADMIN));

// ========== BAN MANAGEMENT ==========
router.post("/user/:id/ban", validate(banUserSchema), adminController.banUser);
router.post("/user/:id/unban", validate(unbanUserSchema), adminController.unbanUser);
router.get("/user/banned", validate(getBannedUsersSchema), adminController.getBannedUsers);
router.get("/user/:id/ban-history", validate(getUserBanHistorySchema), adminController.getUserBanHistory);

// ========== USER MANAGEMENT ==========
router.get("/users", adminController.getAllUsers);
router.get("/tutors/banned", validate(getBannedTutorsSchema), adminController.getBannedTutors);
router.get("/tutors/active", validate(getActiveTutorsSchema), adminController.getActiveTutors);
router.get("/students/banned", validate(getBannedStudentsSchema), adminController.getBannedStudents);
router.get("/students/active", validate(getActiveStudentsSchema), adminController.getActiveStudents);

// ========== TUTOR MANAGEMENT ==========
router.post("/tutor/:id/accept", validate(acceptTutorSchema), adminController.acceptTutor);
router.post("/tutor/:id/reject", validate(rejectTutorSchema), adminController.rejectTutor);
router.get("/tutors/pending", validate(getPendingTutorsSchema), adminController.getPendingTutors);
router.get("/tutors/mapping", adminController.getTutorsWithMapping);
router.get("/tutor/:id", adminController.getTutorProfile);

export default router;
