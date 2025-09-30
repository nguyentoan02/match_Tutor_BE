import { Document, Types } from "mongoose";

export interface IAnswer {
   questionId: Types.ObjectId;
   answer?: any; // Thay string bằng any để hỗ trợ nhiều loại đáp án
   isCorrect?: boolean;
   obtainedPoints?: number;
}

export interface IQuizSubmission extends Document {
   quizId: Types.ObjectId;
   studentId: Types.ObjectId;
   answers?: IAnswer[];
   score?: number;
   submittedAt?: Date;
   quizSnapshot?: {
      quizMode?: string;
      settings?: any;
   };
   gradedBy?: Types.ObjectId;
   gradedAt?: Date;
}
