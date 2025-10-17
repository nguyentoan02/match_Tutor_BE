import { Document, Types } from "mongoose";
import { QuestionTypeEnum } from "../enums/quiz.enum";
import { IQuiz } from "./quiz";

export interface IQuizQuestion extends Document {
   quizId: Types.ObjectId;
   order?: number;
   questionType?: QuestionTypeEnum;

   // Multiple choice
   questionText?: string;
   options?: string[];
   correctAnswer?: string[];

   // Short answer
   acceptedAnswers?: string[];
   caseSensitive?: boolean;

   // Flashcard
   frontText?: string;
   backText?: string;

   // Common
   explanation?: string;
   points?: number;
   createdAt?: Date;
   updatedAt?: Date;
}

export interface IQuizQuestionInfo {
   quizInfo: IQuiz;
   quizQuestions: IQuizQuestion[];
}
