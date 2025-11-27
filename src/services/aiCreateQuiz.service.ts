import materialModel from "../models/material.model";
import { QuestionTypeEnum } from "../types/enums";
import { IQuizBody } from "../types/types/aiCreateQuizResponse";
import { generateQuizFromFileFlexible } from "../utils/createQuiz.util";
import { BadRequestError, NotFoundError } from "../utils/error.response";

class AiCreateQuizService {
   async create(materialId: string): Promise<IQuizBody> {
      const material = await materialModel.findById(materialId);
      if (!material) {
         throw new NotFoundError("not found this material");
      }

      if (!material.fileUrl) {
         throw new BadRequestError("not found file URL");
      }

      const aiResponse = await generateQuizFromFileFlexible({
         fileUrl: material.fileUrl,
         type: QuestionTypeEnum.FLASHCARD,
      });

      return aiResponse;
   }

   async createMCQ(materialId: string): Promise<IQuizBody> {
      const material = await materialModel.findById(materialId);
      if (!material) {
         throw new NotFoundError("not found this material");
      }
      if (!material.fileUrl) {
         throw new BadRequestError("not found file URL");
      }
      const aiResponse = await generateQuizFromFileFlexible({
         fileUrl: material.fileUrl,
         type: QuestionTypeEnum.MULTIPLE_CHOICE,
      });

      return aiResponse;
   }


   async createSAQ(materialId: string): Promise<IQuizBody> {
      const material = await materialModel.findById(materialId);
      if (!material) {
         throw new NotFoundError("not found this material");
      }
      if (!material.fileUrl) {
         throw new BadRequestError("not found file URL");
      }
      const aiResponse = await generateQuizFromFileFlexible({
         fileUrl: material.fileUrl,
         type: QuestionTypeEnum.SHORT_ANSWER,
      });

      return aiResponse;
   }

}

export default new AiCreateQuizService();
