import { Router } from "express";
import controller from "../controllers/teachingRequest.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
   createTeachingRequestSchema,
   respondToRequestSchema,
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

// Tutor responds to a request (Accept/Reject)
router.patch(
   "/:id/respond",
   authenticate,
   isRole(Role.TUTOR),
   validate(respondToRequestSchema),
   controller.respondToRequest
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

export default router;

export const description = "create teaching request from student to tutor";
