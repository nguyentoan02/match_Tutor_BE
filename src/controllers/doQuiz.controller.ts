import { Request, Response } from "express";
import { UnauthorizedError } from "../utils/error.response";
import doQuizService from "../services/doQuiz.service";
import { SubmitQuizBody } from "../schemas/doQuiz.schema";
import { OK } from "../utils/success.response";

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

   async submitedMCQ(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const { quizId } = req.query as { quizId: string };
      const submited = await doQuizService.getSubmitMCQ(
         currentUser._id.toString(),
         quizId!
      );
      new OK({ message: "get mcq history success", metadata: submited }).send(
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
}

export default new DoQuizController();
