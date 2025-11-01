import { Router } from "express";
import paymentController from "../controllers/payment.controller";

const router = Router();

// Webhook public endpoint (no auth)
router.post("/webhook", paymentController.webHook);

export default router;
