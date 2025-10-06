import { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../utils/error.response";
import {
   CreateMultipleChoiceQuizBody,
   CreateQuizBody,
   DeleteQuizBody,
   EditQuizBody,
   quizQuery,
   quizTutorIdQuery,
} from "../schemas/quiz.schema";
import quizService from "../services/quiz.service";
import { OK } from "../utils/success.response";

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

   async QuizByTutor(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const quizes = await quizService.getQuizesByTutor(
         currentUser._id.toString()
      );
      new OK({ message: "get quizes succes", metadata: quizes }).send(res);
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
      const editedQuiz = await quizService.editQuizCombined(
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
   }
}

export default new QuizController();
