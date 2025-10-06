import { Router } from "express";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums/role.enum";
import { validate } from "../middlewares/validation.middleware";
import adminBanController from "../controllers/admin.ban.controller";
import adminUserController from "../controllers/admin.user.controller";
import adminTutorController from "../controllers/admin.tutor.controller";
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
router.post("/user/:id/ban", validate(banUserSchema), adminBanController.banUser);
router.post("/user/:id/unban", validate(unbanUserSchema), adminBanController.unbanUser);
router.get("/user/banned", validate(getBannedUsersSchema), adminBanController.getBannedUsers);
router.get("/user/:id/ban-history", validate(getUserBanHistorySchema), adminBanController.getUserBanHistory);

// ========== USER MANAGEMENT ==========
router.get("/users", adminUserController.getAllUsers);
router.get("/tutors/banned", validate(getBannedTutorsSchema), adminUserController.getBannedTutors);
router.get("/tutors/active", validate(getActiveTutorsSchema), adminUserController.getActiveTutors);
router.get("/students/banned", validate(getBannedStudentsSchema), adminUserController.getBannedStudents);
router.get("/students/active", validate(getActiveStudentsSchema), adminUserController.getActiveStudents);

// ========== TUTOR MANAGEMENT ==========
router.post("/tutor/:id/accept", validate(acceptTutorSchema), adminTutorController.acceptTutor);
router.post("/tutor/:id/reject", validate(rejectTutorSchema), adminTutorController.rejectTutor);
router.get("/tutors/pending", validate(getPendingTutorsSchema), adminTutorController.getPendingTutors);
router.get("/tutor/:id", adminTutorController.getTutorProfile);
router.get("/tutors/mapping", adminTutorController.getTutorsWithMapping);

export default router;
