import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import quizController from "../controllers/quiz.controller";
import ShortAnswerQuizController from "../controllers/shortAnswerQuiz.controller";
import { validate } from "../middlewares/validation.middleware";
import {
   createMultipleChoiceQuizBodySchema,
   createQuizBodySchema,
   deleteQuizBodySchema,
   editMultipleChoiceQuizBodySchema,
   editQuizBodySchema,
   quizQuerySchema,
   quizTutorIdQuerySchema,
   createShortAnswerQuizBodySchema,
   editShortAnswerQuizBodySchema,
   quizListQuerySchema,
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
   validate(quizListQuerySchema),
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
   validate(quizListQuerySchema),
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

router.get(
   "/getMCQAssignedToSession",
   authenticate,
   quizController.getMCQInSessionDetail
);

router.post(
   "/asignMCQToSession",
   authenticate,
   quizController.AsignMCQToSession
);

// Short Answer Quiz Routes
router.post(
   "/short-answer",
   authenticate,
   validate(createShortAnswerQuizBodySchema),
   ShortAnswerQuizController.CreateShortAnswerQuiz
);

router.get(
   "/short-answer",
   authenticate,
   validate(quizQuerySchema),
   ShortAnswerQuizController.GetShortAnswerQuizByQuizId
);

router.put(
   "/short-answer",
   authenticate,
   validate(editShortAnswerQuizBodySchema),
   ShortAnswerQuizController.editShortAnswerQuizByTutor
);

router.get(
   "/short-answer/tutor",
   authenticate,
   validate(quizListQuerySchema),
   ShortAnswerQuizController.GetShortAnswerQuizesByTutor
);

router.delete(
   "/short-answer",
   authenticate,
   validate(deleteQuizBodySchema),
   ShortAnswerQuizController.DeleteShortAnswerQuiz
);

router.post(
   "/asignShortAnswerQuizToSession",
   authenticate,
   ShortAnswerQuizController.AsignShortAnswerQuizToSession
);

router.get(
   "/getShortAnswerQuizzesAssignedToSession",
   authenticate,
   ShortAnswerQuizController.getShortAnswerQuizzesInSessionDetail
);

router.get(
   "/getSessionsAssignedForSAQ",
   authenticate,
   ShortAnswerQuizController.getSessionsAssignedForSAQ
);

router.get(
   "/getMCQSessionsAssigned",
   authenticate,
   quizController.getMCQAssigned
);

export default router;
