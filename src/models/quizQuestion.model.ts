import mongoose, { Schema } from "mongoose";
import { IQuizQuestion } from "../types/types/quizQuestion";
import { getVietnamTime } from "../utils/date.util";
import {
   QUESTION_TYPE_VALUES,
   QuestionTypeEnum,
} from "../types/enums/quiz.enum";

const QuizQuestionSchema: Schema<IQuizQuestion> = new Schema(
   {
      quizId: { type: Schema.Types.ObjectId, ref: "Quiz", required: true },
      questionText: { type: String },
      questionType: {
         type: String,
         enum: QUESTION_TYPE_VALUES,
         default: QuestionTypeEnum.MULTIPLE_CHOICE,
      },
      options: [{ type: String }],
      correctAnswer: { type: String },
      frontText: { type: String },
      backText: { type: String },
      points: { type: Number, default: 0 },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "quiz_questions",
   }
);

QuizQuestionSchema.index({ quizId: 1 });

export default mongoose.model<IQuizQuestion>(
   "QuizQuestion",
   QuizQuestionSchema
);
