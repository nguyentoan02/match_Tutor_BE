import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import quizController from "../controllers/quiz.controller";
import { validate } from "../middlewares/validation.middleware";
import {
   createMultipleChoiceQuizBodySchema,
   createQuizBodySchema,
   deleteQuizBodySchema,
   editMultipleChoiceQuizBodySchema,
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

router.get(
   "/getTutorFlashcardQuiz",
   authenticate,
   quizController.FlashcardQuizByTutor
);

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

router.get(
   "/getMultipleChoiceQuizesByTutor",
   authenticate,
   quizController.GetMultipleChoiceQuizesByTutor
);

router.post(
   "/asignQuizToSession",
   authenticate,
   quizController.AsignQuizToSession
);

router.put(
   "/updateMultipleChoiceQuiz",
   authenticate,
   validate(editMultipleChoiceQuizBodySchema),
   quizController.editMultipleChoiceQuizByTutor
);

router.get("/getSessionsAssigned", authenticate, quizController.getAssigned);

export default router;
