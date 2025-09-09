import { Document, Types } from "mongoose";
import { QuizModeEnum, CardOrderEnum } from "../enums/quiz.enum";

export interface IQuiz extends Document {
   sessionId: Types.ObjectId;
   title: string;
   description?: string;
   quizMode?: QuizModeEnum;
   cardOrder?: CardOrderEnum;
   createdBy?: Types.ObjectId;
   createdAt?: Date;
   updatedAt?: Date;
}
