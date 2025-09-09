import { Document, Types } from "mongoose";

export interface IAnswer {
   questionId: Types.ObjectId;
   answer?: string;
   isCorrect?: boolean;
   obtainedPoints?: number;
}

export interface IQuizSubmission extends Document {
   quizId: Types.ObjectId;
   studentId: Types.ObjectId;
   answers?: IAnswer[];
   score?: number;
   submittedAt?: Date;
   gradedBy?: Types.ObjectId;
   gradedAt?: Date;
}
