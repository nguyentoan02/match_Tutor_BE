import { Router } from "express";
import controller from "../controllers/adminSession.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
   listSessionDisputesSchema,
   getSessionDisputeSchema,
   resolveSessionDisputeSchema,
} from "../schemas/adminSession.schema";
import { Role } from "../types/enums/role.enum";

const router = Router();

// Admin-only routes for session disputes (separate from existing admin routes)
router.use(authenticate, isRole(Role.ADMIN));

router.get(
   "/disputes",
   validate(listSessionDisputesSchema),
   controller.listDisputes
);

router.get(
   "/disputes/:sessionId",
   validate(getSessionDisputeSchema),
   controller.getDispute
);

router.patch(
   "/disputes/:sessionId/resolve",
   validate(resolveSessionDisputeSchema),
   controller.resolve
);

export default router;


