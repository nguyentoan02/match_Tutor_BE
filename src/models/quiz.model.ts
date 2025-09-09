import mongoose, { Schema } from "mongoose";
import { IQuiz } from "../types/types/quiz";
import { getVietnamTime } from "../utils/date.util";
import {
   QUIZ_MODE_VALUES,
   CARD_ORDER_VALUES,
   QuizModeEnum,
   CardOrderEnum,
} from "../types/enums/quiz.enum";

const QuizSchema: Schema<IQuiz> = new Schema(
   {
      sessionId: {
         type: Schema.Types.ObjectId,
         ref: "Session",
         required: true,
      },
      title: { type: String, required: true },
      description: { type: String },
      quizMode: {
         type: String,
         enum: QUIZ_MODE_VALUES,
         default: QuizModeEnum.STUDY,
      },
      cardOrder: {
         type: String,
         enum: CARD_ORDER_VALUES,
         default: CardOrderEnum.FRONT,
      },
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
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
