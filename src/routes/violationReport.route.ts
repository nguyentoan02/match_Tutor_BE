import { Router } from "express";
import violationReportController from "../controllers/violationReport.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
   checkCanReportSchema,
   createViolationReportSchema,
   getViolationReportsSchema,
   updateViolationReportStatusSchema,
} from "../schemas/violationReport.schema";
import { Role } from "../types/enums/role.enum";

const router = Router();

// Check if student can report tutor
router.get(
   "/check/:tutorId",
   authenticate,
   isRole(Role.STUDENT),
   validate(checkCanReportSchema),
   violationReportController.checkCanReport
);

// Create violation report (student only)
router.post(
   "/",
   authenticate,
   isRole(Role.STUDENT),
   validate(createViolationReportSchema),
   violationReportController.createReport
);

// Get violation reports (admin only)
router.get(
   "/",
   authenticate,
   isRole(Role.ADMIN),
   validate(getViolationReportsSchema),
   violationReportController.getReports
);

// Update violation report status (admin only)
router.patch(
   "/:id/status",
   authenticate,
   isRole(Role.ADMIN),
   validate(updateViolationReportStatusSchema),
   violationReportController.updateReportStatus
);

export default router;


