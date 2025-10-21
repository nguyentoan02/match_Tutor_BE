import { Router } from "express";
import controller from "../controllers/teachingRequest.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
   createTeachingRequestSchema,
   trialDecisionSchema,
   cancellationRequestSchema,
   completionRequestSchema, // Import schema mới
   respondToRequestSchema,
   confirmActionSchema,
   getAdminReviewRequestsSchema,
   resolveAdminReviewSchema,
} from "../schemas/teachingRequest.schema";
import { Role } from "../types/enums/role.enum";

const router = Router();

/**
 * POST /api/teachingRequest
 * Body validated by createTeachingRequestSchema
 */
router.post(
   "/",
   authenticate,
   isRole(Role.STUDENT),
   validate(createTeachingRequestSchema),
   controller.create
);

// Get request details (accessible by both student and tutor involved)
router.get("/:id", authenticate, controller.getById);

// Tutor responds to a request (Accept/Reject trial)
router.patch(
   "/:id/respond",
   authenticate,
   isRole(Role.TUTOR),
   validate(respondToRequestSchema),
   controller.respondToRequest
);

// // Student/Tutor makes a decision after trial
// router.patch(
//    "/:id/trial-decision",
//    authenticate,
//    isRole(Role.STUDENT, Role.TUTOR),
//    validate(trialDecisionSchema),
//    controller.makeTrialDecision
// );

// Student/Tutor requests to cancel an ongoing course
router.post(
   "/:id/cancel",
   authenticate,
   isRole(Role.STUDENT, Role.TUTOR),
   validate(cancellationRequestSchema),
   controller.requestCancellation
);

// Student/Tutor requests to complete an ongoing course
router.post(
   "/:id/complete",
   authenticate,
   isRole(Role.STUDENT, Role.TUTOR),
   validate(completionRequestSchema),
   controller.requestCompletion
);

// The other party confirms/rejects the cancellation
router.patch(
   "/:id/confirm-cancellation",
   authenticate,
   isRole(Role.STUDENT, Role.TUTOR),
   validate(confirmActionSchema),
   controller.confirmCancellation
);

// The other party confirms/rejects the completion
router.patch(
   "/:id/confirm-completion",
   authenticate,
   isRole(Role.STUDENT, Role.TUTOR),
   validate(confirmActionSchema),
   controller.confirmCompletion
);

router.get(
   "/completed/between",
   authenticate,
   isRole(Role.STUDENT),
   controller.getCompletedRequestBetween
);

router.get(
   "/student/me",
   authenticate,
   isRole(Role.STUDENT),
   controller.getMyRequestsAsStudent
);

router.get(
   "/tutor/me",
   authenticate,
   isRole(Role.TUTOR),
   controller.getMyRequestsAsTutor
);

// Admin routes for reviewing disputed requests
router.get(
   "/admin/review",
   authenticate,
   isRole(Role.ADMIN),
   validate(getAdminReviewRequestsSchema),
   controller.getRequestsForAdminReview
);

router.post(
   "/admin/review/:id/resolve",
   authenticate,
   isRole(Role.ADMIN),
   validate(resolveAdminReviewSchema),
   controller.resolveAdminReview
);

router.get(
   "/admin/review/resolved",
   authenticate,
   isRole(Role.ADMIN),
   validate(getAdminReviewRequestsSchema),
   controller.getResolvedAdminReviews
);

// NEW: Get admin review history for a specific request
router.get(
   "/:id/admin/review/history",
   authenticate,
   isRole(Role.ADMIN),
   controller.getAdminReviewHistory
);

// GET /api/teachingRequest/admin/review/recently-resolved
router.get(
   "/admin/review/recently-resolved",
   authenticate,
   isRole(Role.ADMIN),
   controller.getRecentlyResolvedAdminReviews
);

export default router;

export const description = "create teaching request from student to tutor";
