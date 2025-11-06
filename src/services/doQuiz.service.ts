import { IAnswer, IQuizSubmission } from "../types/types/quizSubmission";
import quizSubmissionModel from "../models/quizSubmission.model";
import quizQuestionModel from "../models/quizQuestion.model";
import { QuestionTypeEnum } from "../types/enums";
import quizModel from "../models/quiz.model";
import { BadRequestError, NotFoundError } from "../utils/error.response";
import studentModel from "../models/student.model";

class doQuizService {
   private async gradeQuestions(answers: IAnswer[]): Promise<IAnswer[]> {
      const ids = answers.map((a) => a.questionId);
      const questions = await quizQuestionModel.find({ _id: { $in: ids } });
      const questionMap = new Map<string, any>();
      questions.forEach((q) => {
         questionMap.set(String((q as any)._id), q);
      });
      const gradedAnswers = answers.map((answer) => {
         const question = questionMap.get(answer.questionId.toString());

         if (!question) {
            return {
               ...answer,
               isCorrect: false,
               obtainedPoints: 0,
            };
         }

         let isCorrect = false;

         if (question.questionType === QuestionTypeEnum.MULTIPLE_CHOICE) {
            if (Array.isArray(answer.answer)) {
               const studentAnswers = answer.answer as string[];
               const correctAnswers = question.correctAnswer || [];

               isCorrect =
                  studentAnswers.length === correctAnswers.length &&
                  studentAnswers.every((ans) => correctAnswers.includes(ans)) &&
                  correctAnswers.every((ans: any) =>
                     studentAnswers.includes(ans)
                  );
            } else {
               const studentAnswer = answer.answer as string;
               isCorrect =
                  question.correctAnswer?.includes(studentAnswer) || false;
            }
         }

         const obtainedPoints = isCorrect ? question.points || 0 : 0;

         return {
            ...answer,
            isCorrect,
            obtainedPoints,
         };
      });

      return gradedAnswers;
   }
   async submitMCQ(quizData: IQuizSubmission, studentId: string) {
      const existedSub = await quizSubmissionModel.findOne({
         studentId: studentId,
         quizId: quizData.quizId,
      });
      if (existedSub) {
         throw new BadRequestError("Student already taken this test");
      }
      const graded = await this.gradeQuestions(quizData.answers!);
      const score = graded.reduce((sum, g) => sum + (g.obtainedPoints ?? 0), 0);
      const tutorId = await quizModel.findById(quizData.quizId);
      const createdQuizSubmision = await quizSubmissionModel.create({
         quizId: quizData.quizId,
         studentId: studentId,
         answers: graded,
         score,
         quizSnapshot: quizData.quizSnapshot,
         gradedAt: new Date(),
         gradedBy: tutorId?.createdBy,
      });
      return createdQuizSubmision;
   }

   async getSubmitMCQList(userId: string): Promise<IQuizSubmission[]> {
      const list = await quizSubmissionModel
         .find({ studentId: userId })
         .populate({
            path: "quizId",
            select: "title description quizMode quizType totalQuestions -_id",
         })
         .populate({ path: "studentId", select: "name email -_id" })
         .populate({
            path: "answers.questionId",
            select:
               "-_id order questionText options correctAnswer explanation points",
         });
      return list;
   }

   async getSubmitMCQ(
      userId: string,
      quizId: string
   ): Promise<IQuizSubmission> {
      const mcq = await quizSubmissionModel
         .findOne({
            studentId: userId,
            _id: quizId,
         })
         .populate({
            path: "quizId",
            select: "title description quizMode quizType totalQuestions -_id",
         })
         .populate({ path: "studentId", select: "name email -_id" })
         .populate({
            path: "answers.questionId",
            select:
               "-_id order questionText options correctAnswer explanation points",
         });
      if (!mcq) {
         throw new NotFoundError("not found this quiz submission");
      }
      return mcq;
   }
}

export default new doQuizService();
