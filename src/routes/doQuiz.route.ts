import { Router } from "express";
import doQuizController from "../controllers/doQuiz.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
   submitQuizBodySchema,
   submitQuizIdQuerySchema,
} from "../schemas/doQuiz.schema";

const router = Router();

router.post(
   "/submitMCQ",
   authenticate,
   validate(submitQuizBodySchema),
   doQuizController.submitMCQ
);

router.get(
   "/getSubmitedMCQList",
   authenticate,
   doQuizController.submitedMCQList
);

router.get(
   "/getSubmitedMCQ",
   authenticate,
   validate(submitQuizIdQuerySchema),
   doQuizController.submitedMCQ
);

export default router;
