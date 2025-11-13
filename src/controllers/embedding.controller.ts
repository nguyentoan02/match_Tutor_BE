import { Request, Response } from "express";
import embeddingService from "../services/embedding.service";
import { OK } from "../utils/success.response";
import { BadRequestError } from "../utils/error.response";

class embeddingController {
   async embedAll(req: Request, res: Response) {
      await embeddingService.all();
      new OK({ message: "success" }).send(res);
   }

   async clearQueue(req: Request, res: Response) {
      const result = await embeddingService.clearQueue();
      new OK({
         message: "Queue cleared successfully",
         metadata: { cleared: result },
      }).send(res);
   }

   async getQueueStats(req: Request, res: Response) {
      const stats = await embeddingService.getStats();
      new OK({
         message: "Queue statistics retrieved",
         metadata: stats,
      }).send(res);
   }

   async searchVector(req: Request, res: Response) {
      const { keyword } = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 6;

      if (!keyword || typeof keyword !== 'string') {
         throw new BadRequestError("Keyword is required");
      }

      const results = await embeddingService.searchTutorsByVector(
         keyword,
         limit
      );

      new OK({
         message: "Vector search completed",
         metadata: {
            results,
            pagination: {
               page,
               limit,
               total: results.length
            }
         }
      }).send(res);
   }
}

export default new embeddingController();
