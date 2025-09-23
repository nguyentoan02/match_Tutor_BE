import mongoose, { Schema } from "mongoose";
import { IQuiz } from "../types/types/quiz";
import { getVietnamTime } from "../utils/date.util";
import { QUIZ_MODE_VALUES, QuizModeEnum } from "../types/enums/quiz.enum";

const QuizSchema: Schema<IQuiz> = new Schema(
   {
      sessionId: {
         type: Schema.Types.ObjectId,
         ref: "Session",
         required: false,
      },
      title: { type: String, required: true },
      description: { type: String },
      quizMode: {
         type: String,
         enum: QUIZ_MODE_VALUES,
         default: QuizModeEnum.STUDY,
      },
      // Thêm settings để kiểm soát hành vi quiz
      settings: {
         shuffleQuestions: { type: Boolean, default: false },
         showCorrectAnswersAfterSubmit: { type: Boolean, default: true },
         timeLimitMinutes: { type: Number, default: null },
      },
      // Thông tin tạo và phân loại
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
      tags: [{ type: String }],
      totalQuestions: { type: Number, default: 0 },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "quizzes",
   }
);

QuizSchema.index({ sessionId: 1 });

export default mongoose.model<IQuiz>("Quiz", QuizSchema);
