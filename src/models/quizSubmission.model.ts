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
            // answer có thể là string (cho short answer),
            // số (index cho multiple choice)
            // hoặc dữ liệu khác tùy loại câu hỏi
            answer: { type: Schema.Types.Mixed },
            isCorrect: { type: Boolean, default: false },
            obtainedPoints: { type: Number, default: 0 },
            _id: false,
         },
      ],
      score: { type: Number, default: 0 },
      submittedAt: { type: Date, default: getVietnamTime },
      // Thông tin về mode và settings tại thời điểm làm quiz
      quizSnapshot: {
         quizMode: { type: String },
         settings: { type: Schema.Types.Mixed },
      },
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
