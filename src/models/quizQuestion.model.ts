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
      // Thứ tự câu hỏi trong quiz
      order: { type: Number, default: 0 },

      // Loại câu hỏi
      questionType: {
         type: String,
         enum: QUESTION_TYPE_VALUES,
         default: QuestionTypeEnum.MULTIPLE_CHOICE,
      },

      // Trường cho MULTIPLE_CHOICE
      questionText: { type: String },

      // sửa lại thành mảng object để có thể đánh dấu đáp án đúng
      // chỉ cần lấy options ra là biết đáp án đúng là gì
      options: [{ text: String, isCorrect: Boolean }],

      // bỏ các trường này vì nó không hợp lý với logic của multiple choice
      // làm như này là phải check đúng sai dựa trên options chứ không phải correctAnswer nữa
      // đúng ra phải là mảng vì có thể có nhiều đáp án đúng
      // nếu làm như này thì chỉ có thể có một đáp án đúng
      // làm như này thì sẽ không linh hoạt trong việc validate đáp án đúng
      // options: [{ type: String }],
      // correctAnswer: { type: String },

      // Trường cho SHORT_ANSWER
      acceptedAnswers: [{ type: String }], // Có thể chấp nhận nhiều đáp án đúng
      caseSensitive: { type: Boolean, default: false },

      // Trường cho FLASHCARD
      frontText: { type: String },
      backText: { type: String },

      // Phổ biến cho mọi loại
      explanation: { type: String }, // Giải thích hiển thị sau khi trả lời
      points: { type: Number, default: 0 },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "quiz_questions",
   }
);

QuizQuestionSchema.index({ quizId: 1, order: 1 });

export default mongoose.model<IQuizQuestion>(
   "QuizQuestion",
   QuizQuestionSchema
);
