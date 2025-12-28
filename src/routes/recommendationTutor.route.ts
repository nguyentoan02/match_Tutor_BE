import express from "express";
import recommendationTutorController from "../controllers/recommendationTutor.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums/role.enum";

const router = express.Router();

// Học sinh gọi API này để lấy danh sách gia sư gợi ý
router.get(
   "/",
   authenticate,
   isRole(Role.STUDENT),
   recommendationTutorController.getRecommendedTutors
);

export default router;
