import { Request, Response } from "express";
import { UnauthorizedError } from "../utils/error.response";
import aiCreateQuizService from "../services/aiCreateQuiz.service";
import { learningMaterial } from "../schemas/aiCreateQuiz.schema";
import { OK } from "../utils/success.response";

class AiCreateQuizController {
   async createFlashcard(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }

      const body: learningMaterial = req.body;

      const flashcard = await aiCreateQuizService.create(
         currentUser._id.toString(),
         body.materialId
      );

      new OK({ message: "created success", metadata: flashcard }).send(res);
   }
}

export default new AiCreateQuizController();
