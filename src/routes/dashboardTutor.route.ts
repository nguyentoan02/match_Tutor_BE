import { Router } from "express";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums/role.enum";
import * as controller from "../controllers/dashboardTutor.controller";

const router = Router();

// GET /dashboardTutor/
router.get("/", authenticate, isRole(Role.TUTOR), controller.getDashboard);

//  biểu đồ phân tích (Radar & Bar)
router.get(
   "/analysis-charts",
   authenticate,
   isRole(Role.TUTOR),
   controller.getAnalysisCharts
);

// NEW pie endpoint
router.get("/pie", authenticate, isRole(Role.TUTOR), controller.getPieData);

export default router;
