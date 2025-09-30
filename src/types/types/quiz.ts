import { Document, Types } from "mongoose";
import { QuizModeEnum } from "../enums/quiz.enum";

export interface QuizSettings {
   shuffleQuestions?: boolean;
   showCorrectAnswersAfterSubmit?: boolean;
   timeLimitMinutes?: number | null;
}

export interface IQuiz extends Document {
   title: string;
   description?: string;
   quizMode?: QuizModeEnum;
   settings?: QuizSettings;
   createdBy?: Types.ObjectId;
   tags?: string[];
   totalQuestions?: number;
   createdAt?: Date;
   updatedAt?: Date;
   quizQuestions?: Types.ObjectId[];
}
