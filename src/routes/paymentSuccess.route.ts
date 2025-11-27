import { Router } from "express";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import paymentSuccessController from "../controllers/paymentSuccess.controller";
import { Role } from "../types/enums/role.enum";

const router = Router();

/**
 * GET /paymentSuccess/payments
 * Lấy danh sách payment thành công của tutor
 * - Yêu cầu xác thực
 * - Chỉ tutor mới được truy cập
 */
router.get(
   "/payments",
   authenticate,
   isRole(Role.TUTOR),
   paymentSuccessController.getSuccessfulPaymentsTutor
);

/**
 * GET /paymentSuccess/payments
 * Lấy danh sách payment thành công của student (learningCommitment)
 * - Yêu cầu xác thực
 * - Chỉ student mới được truy cập
 */
router.get(
   "/paymentsStudent",
   authenticate,
   isRole(Role.STUDENT),
   paymentSuccessController.getSuccessfulPaymentsStudent
);

export default router;
