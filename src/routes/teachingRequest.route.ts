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

// Đặt các route cụ thể trước route động
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

// Tutor view student profile (full info)
router.get(
   "/student-profile/:studentUserId",
   authenticate,
   isRole(Role.TUTOR),
   controller.getStudentProfile
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

export default router;

export const description = "create teaching request from student to tutor";
