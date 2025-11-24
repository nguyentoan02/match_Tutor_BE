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

      const flashcard = await aiCreateQuizService.create(body.materialId);

      new OK({ message: "created success", metadata: flashcard }).send(res);
   }

   async createMCQ(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const body: learningMaterial = req.body;

      const mcq = await aiCreateQuizService.createMCQ(body.materialId);

      new OK({ message: "created success", metadata: mcq }).send(res);
   }

   async createSAQ(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const body: learningMaterial = req.body;

      const saq = await aiCreateQuizService.createSAQ(body.materialId);

      new OK({ message: "created success", metadata: saq }).send(res);
   }

}

export default new AiCreateQuizController();
