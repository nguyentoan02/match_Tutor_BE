import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import aiCreateQuizController from "../controllers/aiCreateQuiz.controller";
import { validate } from "../middlewares/validation.middleware";
import { learningMaterialSchema } from "../schemas/aiCreateQuiz.schema";

const router = Router();

router.post(
   "/createFL",
   authenticate,
   validate(learningMaterialSchema),
   aiCreateQuizController.createFlashcard
);

router.post(
   "/createMCQ",
   authenticate,
   validate(learningMaterialSchema),
   aiCreateQuizController.createMCQ
);

export default router;
