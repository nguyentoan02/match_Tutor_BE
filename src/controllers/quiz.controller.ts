import { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../utils/error.response";
import {
   AsignQuizToSessionBody,
   CreateMultipleChoiceQuizBody,
   CreateQuizBody,
   DeleteQuizBody,
   editMultipleChoiceQuizBody,
   EditQuizBody,
} from "../schemas/quiz.schema";
import quizService from "../services/quiz.service";
import { OK } from "../utils/success.response";
import { QuestionTypeEnum } from "../types/enums";

class QuizController {
   async tutorCreateQuiz(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const quizArt: CreateQuizBody = req.body;
      const createdQuiz = await quizService.createQuiz(
         currentUser._id.toString(),
         {
            title: quizArt.title,
            description: quizArt.description,
            settings: quizArt.settings,
            tags: quizArt.tags,
         },
         quizArt.questionArr
      );
      new OK({ message: "quiz created success", metadata: createdQuiz }).send(
         res
      );
   }

   async FlashcardQuizByTutor(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const quizes = await quizService.getFlashcardQuizesByTutor(
         currentUser._id.toString()
      );
      new OK({ message: "get quizes success", metadata: quizes }).send(res);
   }

   async QuizQuestions(req: Request, res: Response) {
      const { quizId } = req.query;
      if (!quizId) throw new BadRequestError("invalid quizId");
      const quizQuestions = await quizService.getQuizQuestionByQuiz(
         quizId.toString()
      );
      new OK({
         message: "get quiz questions success",
         metadata: quizQuestions,
      }).send(res);
   }

   async QuizByTutorId(req: Request, res: Response) {
      const { tutorId } = req.query;
      if (!tutorId) {
         throw new BadRequestError("invalid tutorId");
      }
      const quizes = await quizService.getQuizesByTutor(tutorId.toString());
      new OK({ message: "get quizes success", metadata: quizes }).send(res);
   }

   async EditQuizByTutor(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const editQuizArt: EditQuizBody = req.body;
      const editedQuiz = await quizService.editFlashcardQuizCombined(
         currentUser._id.toString(),
         {
            _id: editQuizArt._id,
            title: editQuizArt.title,
            description: editQuizArt.description,
            settings: editQuizArt.settings,
            tags: editQuizArt.tags,
            quizMode: editQuizArt.quizMode,
         },
         editQuizArt.editQuestionArr,
         editQuizArt.newQuestionArr,
         editQuizArt.deleteQuestionArr
      );
      new OK({ message: "edit quiz success", metadata: editedQuiz }).send(res);
   }

   async DeleteQuizByTutor(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const deleteQuiz: DeleteQuizBody = req.body;
      await quizService.deleteQuiz(
         deleteQuiz.quizId,
         currentUser._id.toString()
      );
      new OK({ message: "delete success" }).send(res);
   }

   async CreateMultipleChoiceQuiz(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const createQuiz: CreateMultipleChoiceQuizBody = req.body;
      const createdQuiz = await quizService.createMultipleChoiceQuiz(
         currentUser._id.toString(),
         {
            title: createQuiz.title,
            description: createQuiz.description,
            settings: createQuiz.settings,
            tags: createQuiz.tags,
            quizMode: createQuiz.quizMode,
            quizType: QuestionTypeEnum.MULTIPLE_CHOICE,
         },
         createQuiz.questionArr
      );
      new OK({ message: "create quiz success", metadata: createdQuiz }).send(
         res
      );
   }

   async GetMultipleChoiceQuizByQuizId(req: Request, res: Response) {
      const { quizId } = req.query;
      if (!quizId) throw new BadRequestError("invalid quizId");
      const quizQuestions = await quizService.getMultipleChoiceQuizByQuizId(
         quizId.toString()
      );
      new OK({
         message: "get multiple choice quiz by quizId success",
         metadata: quizQuestions,
      }).send(res);
   }

   async editMultipleChoiceQuizByTutor(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const editQuiz: editMultipleChoiceQuizBody = req.body;
      const editedQuiz = await quizService.editMultipleChoiceQuizCombined(
         currentUser._id.toString(),
         {
            _id: editQuiz._id,
            title: editQuiz.title,
            description: editQuiz.description,
            settings: editQuiz.settings,
            tags: editQuiz.tags,
            quizMode: editQuiz.quizMode,
            quizType: QuestionTypeEnum.MULTIPLE_CHOICE,
         },
         editQuiz.newMultipleChoiceQuizQuestionsArr ?? [],
         editQuiz.editMultipleChoiceQuizQuestionsArr ?? [],
         editQuiz.deleteMultipleChoiceQuizQuestionsArr ?? []
      );
      new OK({ message: "edit quiz success", metadata: editedQuiz }).send(res);
   }

   async AsignQuizToSession(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const asignQuizPayload: AsignQuizToSessionBody = req.body;
      console.log("asignQuizPayload:", asignQuizPayload);
      const asignResult = await quizService.asignQuizToSession(
         currentUser._id.toString(),
         asignQuizPayload.quizIds,
         asignQuizPayload.sessionId
      );
      new OK({ message: "asign quiz success", metadata: asignResult }).send(
         res
      );
   }

   async GetMultipleChoiceQuizesByTutor(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const quizes = await quizService.getMultipleChoiceQuizesByTutor(
         currentUser._id.toString()
      );
      new OK({ message: "get quizes success", metadata: quizes }).send(res);
   }

   async getAssigned(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const quizId = req.query.quizId as string;
      if (!quizId) {
         throw new BadRequestError("invalid quizId");
      }
      const sessions = await quizService.getSessionsAssigned(quizId);
      new OK({
         message: "get sessions assigned success",
         metadata: sessions,
      }).send(res);
   }
}

export default new QuizController();
