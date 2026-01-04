import mongoose, { Schema } from "mongoose";
import { IQuiz } from "../types/types/quiz";
import { getVietnamTime } from "../utils/date.util";
import {
   QUESTION_TYPE_VALUES,
   QuestionTypeEnum,
   QUIZ_MODE_VALUES,
   QuizModeEnum,
} from "../types/enums/quiz.enum";
import { SUBJECT_VALUES } from "../types/enums/subject.enum";
import { LEVEL_VALUES } from "../types/enums/level.enum";

const QuizSchema: Schema<IQuiz> = new Schema(
   {
      // sessionId: {
      //    type: Schema.Types.ObjectId,
      //    ref: "Session",
      //    required: false,
      // },
      // không cần trường này trong model này nữa vì trong session nó reference đến Quiz rồi
      // bởi vì một bộ quiz có thể được reference tới nhiều session khác nhau
      // khi xóa thì sẽ check là đã bỏ hết các quizz này ra khỏi các session chưa thì mới được xóa
      title: { type: String, required: true },
      description: { type: String },
      quizMode: {
         type: String,
         enum: QUIZ_MODE_VALUES,
         default: QuizModeEnum.STUDY,
      },
      quizType: {
         enum: QUESTION_TYPE_VALUES,
         type: String,
         default: QuestionTypeEnum.FLASHCARD,
      },
      // Thêm settings để kiểm soát hành vi quiz
      settings: {
         shuffleQuestions: { type: Boolean, default: false }, // flashcard chỉ được dùng cái này
         showCorrectAnswersAfterSubmit: { type: Boolean, default: true },
         timeLimitMinutes: { type: Number, default: null },
      },
      // Thông tin tạo và phân loại
      createdBy: { type: Schema.Types.ObjectId, ref: "User" },
      tags: [{ type: String }],
      totalQuestions: { type: Number, default: 0 },
      subject: { type: String, enum: SUBJECT_VALUES, required: false },
      level: { type: String, enum: LEVEL_VALUES, required: false },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "quizzes",
   }
);

QuizSchema.index({ sessionId: 1 });
// Giúp đếm số lượng quiz của user ngay lập tức
QuizSchema.index({ createdBy: 1 });
// Indexes for search by subject and level
QuizSchema.index({ subject: 1 });
QuizSchema.index({ level: 1 });
QuizSchema.index({ subject: 1, level: 1 });
QuizSchema.index({ createdBy: 1, quizType: 1, subject: 1, level: 1 });
export default mongoose.model<IQuiz>("Quiz", QuizSchema);
