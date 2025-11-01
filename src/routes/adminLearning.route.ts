import { Router } from "express";
import controller from "../controllers/adminLearning.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums/role.enum";

const router = Router();

// Apply authentication and admin middleware
router.use(authenticate, isRole(Role.ADMIN));

// GET endpoints
router.get("/", controller.listLearningCommitments);

router.get("/disagreements", controller.getDisagreementCases);

router.get("/:id", controller.getLearningCommitmentDetail);

// POST endpoints
router.post(
   "/:id/handle-disagreement",
   controller.handleCancellationDisagreement
);

router.post("/:id/approve-cancellation", controller.approveCancellation);

router.post("/:id/reject-cancellation", controller.rejectCancellation);

export default router;
