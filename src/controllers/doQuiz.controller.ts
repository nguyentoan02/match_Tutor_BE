import { Request, Response } from "express";
import { UnauthorizedError } from "../utils/error.response";
import doQuizService from "../services/doQuiz.service";
import { SubmitQuizBody } from "../schemas/doQuiz.schema";
import { OK } from "../utils/success.response";
import { QuestionTypeEnum } from "../types/enums";
import quizModel from "../models/quiz.model";

class DoQuizController {
   async submitMCQ(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const data = req.body;
      const submited = await doQuizService.submitMCQ(data, currentUser.id);
      new OK({
         message: "submit Multiple Choice Quiz success",
         metadata: submited,
      }).send(res);
   }

   async submitShortAnswer(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const data = req.body;

      // Verify that the quiz is actually a short answer quiz
      const quiz = await quizModel.findById(data.quizId);
      if (!quiz || quiz.quizType !== QuestionTypeEnum.SHORT_ANSWER) {
         throw new UnauthorizedError("This is not a short answer quiz");
      }

      const submited = await doQuizService.submitShortAnswer(data, currentUser.id);
      new OK({
         message: "submit Short Answer Quiz success",
         metadata: submited,
      }).send(res);
   }

   async submitedMCQList(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const submitList = await doQuizService.getSubmitMCQList(
         currentUser._id.toString()
      );
      new OK({ message: "get list success", metadata: submitList }).send(res);
   }

   async submitedShortAnswerList(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const submitList = await doQuizService.getSubmitShortAnswerList(
         currentUser._id.toString()
      );
      new OK({ message: "get Short Answer list success", metadata: submitList }).send(res);
   }

   async submitedMCQ(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const { quizId } = req.query as { quizId: string };
      const submited = await doQuizService.getSubmitMCQ(quizId!);
      new OK({ message: "get mcq history success", metadata: submited }).send(
         res
      );
   }

   async submitedShortAnswer(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const { quizId } = req.query as { quizId: string };
      const submited = await doQuizService.getSubmitShortAnswer(quizId!);
      new OK({ message: "get short answer history success", metadata: submited }).send(
         res
      );
   }


   async getNumberOfAttempt(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const { sessionId } = req.query as {
         sessionId: string;
      };
      const attempt = await doQuizService.attempt(
         currentUser._id.toString(),
         sessionId
      );
      new OK({ message: "get attempt success", metadata: attempt }).send(res);
   }

   async getStudentSubmitedMCQ(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const submitedList = await doQuizService.studentSubmissions(
         currentUser._id.toString()
      );

      new OK({
         message: "found submissions of students",
         metadata: submitedList,
      }).send(res);
   }

   async getStudentSubmitedShortAnswer(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const submitedList = await doQuizService.getStudentShortAnswerSubmissions(
         currentUser._id.toString()
      );

      new OK({
         message: "found short answer submissions of students",
         metadata: submitedList,
      }).send(res);
   }

}

export default new DoQuizController();
