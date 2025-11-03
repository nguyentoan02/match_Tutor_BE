import { Router } from "express";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums/role.enum";
import * as packagePaymentController from "../controllers/packagePayment.controller";

const router = Router();

// POST /api/packagePayment/initiate
// - Authenticated tutor initiates package payment
router.post(
   "/initiate",
   authenticate,
   isRole(Role.TUTOR),
   packagePaymentController.initiatePackagePayment
);

// Loại bỏ webhook này - dùng webhook chung trong payment.route.ts
// router.post("/webhook", packagePaymentController.handlePackagePaymentWebhook);

export default router;
