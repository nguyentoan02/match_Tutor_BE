import { Router } from "express";
import doQuizController from "../controllers/doQuiz.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
   attemptQuizSubmissionQuerySchema,
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

router.get(
   "/getAttemptMCQ",
   authenticate,
   validate(attemptQuizSubmissionQuerySchema),
   doQuizController.getNumberOfAttempt
);

router.get(
   "/getAllStudenSubmitedMCQ",
   authenticate,
   doQuizController.getStudentSubmitedMCQ
);

// Short Answer Quiz Routes
router.post(
   "/submitShortAnswer",
   authenticate,
   validate(submitQuizBodySchema),
   doQuizController.submitShortAnswer
);

router.get(
   "/getSubmitedShortAnswerList",
   authenticate,
   doQuizController.submitedShortAnswerList
);

router.get(
   "/getSubmitedShortAnswer",
   authenticate,
   validate(submitQuizIdQuerySchema),
   doQuizController.submitedShortAnswer
);

router.get(
   "/getAllStudentSubmitedShortAnswer",
   authenticate,
   doQuizController.getStudentSubmitedShortAnswer
);


export default router;
