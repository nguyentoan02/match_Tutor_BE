import { Router } from "express";
import doQuizController from "../controllers/doQuiz.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { submitQuizBodySchema } from "../schemas/doQuiz.schema";

const router = Router();

router.post(
   "/submitMCQ",
   authenticate,
   validate(submitQuizBodySchema),
   doQuizController.submitMCQ
);

export default router;
