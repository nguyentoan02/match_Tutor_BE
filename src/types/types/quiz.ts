import { Document, Types } from "mongoose";
import { QuestionTypeEnum, QuizModeEnum } from "../enums/quiz.enum";

export interface QuizSettings {
   shuffleQuestions?: boolean;
   showCorrectAnswersAfterSubmit?: boolean;
   timeLimitMinutes?: number | null;
}

export interface IQuiz extends Document {
   title: string;
   description?: string;
   quizMode?: QuizModeEnum;
   quizType: QuestionTypeEnum;
   settings?: QuizSettings;
   createdBy?: Types.ObjectId;
   tags?: string[];
   totalQuestions?: number;
   createdAt?: Date;
   updatedAt?: Date;
   quizQuestions?: Types.ObjectId[];
}

export interface IQuizInfo {
   _id?: string;
   title: string;
   description?: string;
   quizMode?: QuizModeEnum;
   quizType: QuestionTypeEnum;
   settings?: QuizSettings;
   createdBy?: Types.ObjectId;
   tags?: string[];
   totalQuestions?: number;
   createdAt?: Date;
   updatedAt?: Date;
}
