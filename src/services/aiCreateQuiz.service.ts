import materialModel from "../models/material.model";
import { IQuizBody } from "../types/types/aiCreateQuizResponse";
import { generateQuizFromFile } from "../utils/createQuiz.util";
import { BadRequestError, NotFoundError } from "../utils/error.response";

class AiCreateQuizService {
   async create(tutorId: string, materialId: string): Promise<IQuizBody> {
      const material = await materialModel.findById(materialId);
      if (!material) {
         throw new NotFoundError("not found this material");
      }

      if (!material.fileUrl) {
         throw new BadRequestError("not found file URL");
      }

      const aiResponse = await generateQuizFromFile(material.fileUrl);

      return aiResponse;
   }
}

export default new AiCreateQuizService();
