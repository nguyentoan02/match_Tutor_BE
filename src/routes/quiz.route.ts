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
// get Flashcard quizzes by tutor id
router.get(
   "/getQuizsByTutor",
   validate(quizTutorIdQuerySchema),
   quizController.QuizByTutorId
);
// edit flashcard quiz by tutor
router.put(
   "/editQuiz",
   authenticate,
   validate(editQuizBodySchema),
   quizController.EditQuizByTutor
);
// delete quiz by tutor
router.delete(
   "/deleteQuiz",
   authenticate,
   validate(deleteQuizBodySchema),
   quizController.DeleteQuizByTutor
);
// create multiple choice quiz
router.post(
   "/createMultipleChoiceQuiz",
   authenticate,
   validate(createMultipleChoiceQuizBodySchema),
   quizController.CreateMultipleChoiceQuiz
);
// get multiple choice quiz by quiz id to review
router.get(
   "/getMultipleChoiceQuizByQuizId",
   // authenticate,
   validate(quizQuerySchema),
   quizController.GetMultipleChoiceQuizByQuizId
);
// get list multiple choice quizzes by tutor id Viewlist
router.get(
   "/getMultipleChoiceQuizesByTutor",
   authenticate,
   quizController.GetMultipleChoiceQuizesByTutor
);
// assign quiz to session
router.post(
   "/asignQuizToSession",
   authenticate,
   quizController.AsignQuizToSession
);
// edit multiple choice quiz
router.put(
   "/updateMultipleChoiceQuiz",
   authenticate,
   validate(editMultipleChoiceQuizBodySchema),
   quizController.editMultipleChoiceQuizByTutor
);
//check xem nhung session nao duoc giao quiz
router.get("/getSessionsAssigned", authenticate, quizController.getAssigned);
//get quizzes in session detail
router.get(
   "/getQuizzesAssignedToSession",
   authenticate,
   quizController.getQuizzesInSessionDetail
);

export default router;
