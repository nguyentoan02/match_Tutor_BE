import { Request, Response } from "express";
import { SuccessResponse } from "../utils/success.response";
import recommendationTutorService from "../services/recommendationtutor.service";
import { UnauthorizedError } from "../utils/error.response";

export class RecommendationTutorController {
   async getRecommendedTutors(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Người dùng chưa đăng nhập");
      }

      const result =
         await recommendationTutorService.getRecommendedTutorsForStudent(
            String(currentUser._id)
         );

      new SuccessResponse({
         message: "Gợi ý gia sư phù hợp thành công",
         metadata: result,
      }).send(res);
   }
}

export default new RecommendationTutorController();
