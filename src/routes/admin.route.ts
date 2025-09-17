import { Router } from "express";
import adminController from "../controllers/admin.controller";
import { validate } from "../middlewares/validation.middleware";
import { 
   banUserSchema, 
   unbanUserSchema, 
   getBannedUsersSchema,
   getUserBanHistorySchema 
} from "../schemas/admin.schema";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums/role.enum";

const router = Router();

// All admin routes require authentication and ADMIN role
router.use(authenticate);
router.use(isRole(Role.ADMIN));

// User management routes
// Ban a user
router.post(
   "/user/:id/ban",
   validate(banUserSchema),
   adminController.banUser
);

// Unban a user
router.post(
   "/user/:id/unban",
   validate(unbanUserSchema),
   adminController.unbanUser
);

// Get banned users list
router.get(
   "/user/banned",
   validate(getBannedUsersSchema),
   adminController.getBannedUsers
);

// Get user ban history
router.get(
   "/user/:id/ban-history",
   validate(getUserBanHistorySchema),
   adminController.getUserBanHistory
);

// Get all users with pagination and search
router.get(
   "/users",
   adminController.getAllUsers
);

export default router;

export const description = "admin user management and ban/unban functionality";
