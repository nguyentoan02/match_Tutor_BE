import { Router } from "express";
import userController from "../controllers/user.controller";
import { validate } from "../middlewares/validation.middleware";
import {
    createUserSchema,
    updateUserSchema,
    getUserByIdSchema,
    getUserByEmailSchema,
    deleteUserSchema,
} from "../schemas/user.schema";

const router = Router();

// POST /api/users - Create user
router.post("/", validate(createUserSchema), userController.createUser);

// GET /api/users - Get all users (no validation needed)
router.get("/", userController.getAllUsers);

// GET /api/users/:id - Get user by ID
router.get("/:id", validate(getUserByIdSchema), userController.getUserById);

// GET /api/users/email/:email - Get user by email
router.get(
    "/email/:email",
    validate(getUserByEmailSchema),
    userController.getUserByEmail
);

// PUT /api/users/:id - Update user
router.put("/:id", validate(updateUserSchema), userController.updateUser);

// DELETE /api/users/:id - Delete user
router.delete("/:id", validate(deleteUserSchema), userController.deleteUser);

export default router;

// Metadata để mô tả route (tùy chọn)
export const description = "User management and authentication routes";
