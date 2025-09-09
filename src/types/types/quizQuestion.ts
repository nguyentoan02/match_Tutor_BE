import { Document, Types } from "mongoose";
import { QuestionTypeEnum } from "../enums/quiz.enum";

export interface IQuizQuestion extends Document {
   quizId: Types.ObjectId;
   questionText?: string;
   questionType?: QuestionTypeEnum;
   options?: string[]; // for multiple_choice
   correctAnswer?: string;
   frontText?: string; // for flashcard
   backText?: string; // for flashcard
   points?: number;
   createdAt?: Date;
   updatedAt?: Date;
}
