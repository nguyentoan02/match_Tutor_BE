import { Router } from "express";
import {
   getWallet,
   withdraw,
   getPayoutHistoryController,
} from "../controllers/wallet.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums/role.enum";

const router = Router();

// GET wallet - userId được lấy từ token auth
router.get("/", authenticate, getWallet);

// GET payout history - Lấy lịch sử giao dịch rút tiền
router.get("/history", authenticate, getPayoutHistoryController);

// POST withdraw - Tạo yêu cầu rút tiền
router.post(
   "/withdraw",
   authenticate,
   isRole(Role.STUDENT, Role.TUTOR),
   withdraw
);

export default router;
