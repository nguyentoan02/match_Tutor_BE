import { Router } from "express";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums/role.enum";
import * as controller from "../controllers/dashboardTutor.controller";

const router = Router();

// GET /dashboardTutor/
router.get("/", authenticate, isRole(Role.TUTOR), controller.getDashboard);

// GET /dashboardTutor/bubble?month=MM&year=YYYY&week=1..4
router.get(
   "/bubble",
   authenticate,
   isRole(Role.TUTOR),
   controller.getBubbleData
);

// GET /dashboardTutor/sessions/status-line?month=MM&year=YYYY&week=1..4
router.get(
   "/sessions/status-line",
   authenticate,
   isRole(Role.TUTOR),
   controller.getSessionStatusLine
);

// GET /dashboardTutor/charts?month=MM&year=YYYY&week=1..4
router.get(
   "/charts",
   authenticate,
   isRole(Role.TUTOR),
   controller.getAllDashboard
);

// NEW pie endpoint
router.get("/pie", authenticate, isRole(Role.TUTOR), controller.getPieData);

export default router;
