import { Router } from "express";
import { getWallet } from "../controllers/wallet.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// GET wallet - userId được lấy từ token auth
router.get("/", authenticate, getWallet);

export default router;
