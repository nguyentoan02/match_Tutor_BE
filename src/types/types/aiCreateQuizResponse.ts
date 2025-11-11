// src/types/quiz.ts

export enum QuizModeEnum {
   STUDY = "STUDY",
   EXAM = "EXAM",
}

export enum QuestionTypeEnum {
   MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
   SHORT_ANSWER = "SHORT_ANSWER",
   FLASHCARD = "FLASHCARD",
}

export interface QuizSettings {
   shuffleQuestions?: boolean;
   showCorrectAnswersAfterSubmit?: boolean;
   timeLimitMinutes?: number | null;
}

export interface IQuizQuestion {
   _id?: string;
   order: number;
   questionType: QuestionTypeEnum;

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

export interface IQuizBody {
   title: string;
   description?: string;
   quizMode?: QuizModeEnum;
   settings?: QuizSettings;
   createdBy?: string;
   tags?: string[];
   totalQuestions?: number;
   createdAt?: Date;
   updatedAt?: Date;
   questionArr: IQuizQuestion[];
}
