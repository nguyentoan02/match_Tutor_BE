import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
   parentRequestAcceptTokenRequest,
   parentRequestBody,
   parentRequestTokenRequest,
} from "../schemas/parentRequest.schema";
import parentRequestController from "../controllers/parentRequest.controller";

const router = Router();

router.post(
   "/inviteParent",
   authenticate,
   validate(parentRequestBody),
   parentRequestController.studentSendRequest
);

router.post(
   "/activeParentAccount",
   validate(parentRequestTokenRequest),
   parentRequestController.activeParentAccount
);

router.get(
   "/acceptInvitation",
   validate(parentRequestAcceptTokenRequest),
   parentRequestController.acceptInvitation
);

export default router;
