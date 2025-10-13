import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import quizController from "../controllers/quiz.controller";
import { validate } from "../middlewares/validation.middleware";
import {
   createMultipleChoiceQuizBodySchema,
   createQuizBodySchema,
   deleteQuizBodySchema,
   editQuizBodySchema,
   quizQuerySchema,
   quizTutorIdQuerySchema,
} from "../schemas/quiz.schema";

const router = Router();

router.post(
   "/createQuiz",
   authenticate,
   validate(createQuizBodySchema),
   quizController.tutorCreateQuiz
);

router.get("/getTutorQuiz", authenticate, quizController.QuizByTutor);

router.get(
   "/getQuizQuestionsByQuiz",
   validate(quizQuerySchema),
   quizController.QuizQuestions
);

router.get(
   "/getQuizsByTutor",
   validate(quizTutorIdQuerySchema),
   quizController.QuizByTutorId
);

router.put(
   "/editQuiz",
   authenticate,
   validate(editQuizBodySchema),
   quizController.EditQuizByTutor
);

router.delete(
   "/deleteQuiz",
   authenticate,
   validate(deleteQuizBodySchema),
   quizController.DeleteQuizByTutor
);

router.post(
   "/createMultipleChoiceQuiz",
   authenticate,
   validate(createMultipleChoiceQuizBodySchema),
   quizController.CreateMultipleChoiceQuiz
);

router.get(
   "/getMultipleChoiceQuizByQuizId",
   // authenticate,
   validate(quizQuerySchema),
   quizController.GetMultipleChoiceQuizByQuizId
);

router.post(
   "/asignQuizToSession",
   authenticate,
   quizController.AsignQuizToSession
);

export default router;
