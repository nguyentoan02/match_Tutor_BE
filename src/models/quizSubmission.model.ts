import mongoose, { Schema } from "mongoose";
import { IQuizSubmission } from "../types/types/quizSubmission";
import { getVietnamTime } from "../utils/date.util";

const QuizSubmissionSchema: Schema<IQuizSubmission> = new Schema(
   {
      quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
      studentId: {
         type: Schema.Types.ObjectId,
         ref: "Student",
         required: true,
      },
      answers: [
         {
            questionId: { type: Schema.Types.ObjectId, ref: "QuizQuestion" },
            answer: { type: String },
            isCorrect: { type: Boolean },
            obtainedPoints: { type: Number },
            _id: false,
         },
      ],
      score: { type: Number },
      submittedAt: { type: Date, default: getVietnamTime },
      gradedBy: { type: Schema.Types.ObjectId, ref: "User" },
      gradedAt: { type: Date },
   },
   {
      collection: "quiz_submissions",
   }
);

QuizSubmissionSchema.index({ quizId: 1, studentId: 1 });

export default mongoose.model<IQuizSubmission>(
   "QuizSubmission",
   QuizSubmissionSchema
);
