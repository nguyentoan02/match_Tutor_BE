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
      console.log(data);
      new OK({
         message: "submit Multiple Choice Quiz success",
         metadata: submited,
      }).send(res);
   }
}

export default new DoQuizController();
