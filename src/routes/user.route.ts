import { Router } from "express";
import userController from "../controllers/user.controller";
import { validate } from "../middlewares/validation.middleware";
import { updateUserSchema } from "../schemas/user.schema";
import { authenticate } from "../middlewares/auth.middleware";
import { uploadSingle } from "../middlewares/upload.middleware";

const router = Router();

// Get current user profile
router.get("/me", authenticate, userController.getMe);

// Update current user profile (supports optional avatar upload)
router.put(
   "/me",
   authenticate,
   uploadSingle("avatar"),
   validate(updateUserSchema),
   userController.updateMe
);

export default router;

export const description = "update user profile";
