import {
   IAnswer,
   IQuizAttempt,
   IQuizSubmission,
} from "../types/types/quizSubmission";
import quizSubmissionModel from "../models/quizSubmission.model";
import quizQuestionModel from "../models/quizQuestion.model";
import { QuestionTypeEnum } from "../types/enums";
import quizModel from "../models/quiz.model";
import { NotFoundError } from "../utils/error.response";
import studentModel from "../models/student.model";
import sessionModel from "../models/session.model";
import { Types } from "mongoose";
import teachingRequestModel from "../models/teachingRequest.model";
import tutorModel from "../models/tutor.model";
import userModel from "../models/user.model";
import { addNotificationJob } from "../queues/notification.queue";
import notificationSocketService from "../socket/notificationSocket";

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

   private async gradeShortAnswerQuestions(
      answers: IAnswer[]
   ): Promise<IAnswer[]> {
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

         if (question.questionType === QuestionTypeEnum.SHORT_ANSWER) {
            const studentAnswer = answer.answer as string;
            const acceptedAnswers = (question.acceptedAnswers ||
               []) as string[];

            if (question.caseSensitive) {
               // Case sensitive comparison
               isCorrect = acceptedAnswers.some(
                  (accepted: string) => accepted === studentAnswer
               );
            } else {
               // Case insensitive comparison
               isCorrect = acceptedAnswers.some(
                  (accepted: string) =>
                     accepted.toLowerCase() === studentAnswer.toLowerCase()
               );
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
      try {
         const existedSub = await quizSubmissionModel.findOne({
            studentId: studentId,
            quizId: quizData.quizId,
         });

         const graded = await this.gradeQuestions(quizData.answers!);
         const score = graded.reduce(
            (sum, g) => sum + (g.obtainedPoints ?? 0),
            0
         );

         const quiz = await quizModel.findById(quizData.quizId);
         if (!quiz) {
            throw new NotFoundError("Quiz not found");
         }

         const createdQuizSubmission = await quizSubmissionModel.create({
            quizId: quizData.quizId,
            studentId: studentId,
            answers: graded,
            score,
            quizSnapshot: quizData.quizSnapshot,
            gradedAt: new Date(),
            gradedBy: quiz.createdBy,
            attempt: existedSub ? existedSub.attempt + 1 : 1,
         });

         const student = await userModel.findById(studentId);

         // Send notification to the tutor who created the quiz
         if (quiz.createdBy && student) {
            await addNotificationJob(
               quiz.createdBy.toString(),
               "Bài tập trắc nghiệm đã được hoàn thành",
               `Quiz "${quiz.title || "Untitled"}" đã được hoàn thành bởi ${student.name
               }`
            );
            console.log(`📨 Notification queued for tutor: ${quiz.createdBy}`);
         }

         return createdQuizSubmission;
      } catch (error) {
         console.error("Error in submitMCQ:", error);
         throw error;
      }
   }

   async submitShortAnswer(quizData: IQuizSubmission, studentId: string) {
      try {
         const existedSub = await quizSubmissionModel.findOne({
            studentId: studentId,
            quizId: quizData.quizId,
         });

         const graded = await this.gradeShortAnswerQuestions(quizData.answers!);
         const score = graded.reduce(
            (sum, g) => sum + (g.obtainedPoints ?? 0),
            0
         );

         const quiz = await quizModel.findById(quizData.quizId);
         if (!quiz) {
            throw new NotFoundError("Quiz not found");
         }

         const createdQuizSubmission = await quizSubmissionModel.create({
            quizId: quizData.quizId,
            studentId: studentId,
            answers: graded,
            score,
            quizSnapshot: quizData.quizSnapshot,
            gradedAt: new Date(),
            gradedBy: quiz.createdBy,
            attempt: existedSub ? existedSub.attempt + 1 : 1,
         });

         const student = await userModel.findById(studentId);

         // Send notification to the tutor who created the quiz
         if (quiz.createdBy && student) {
            await addNotificationJob(
               quiz.createdBy.toString(), // Convert ObjectId to string
               "Bài tập tự luận đã được hoàn thành",
               `Quiz "${quiz.title || "Untitled"}" đã được hoàn thành bởi ${student.name
               }`
            );
            console.log(`📨 Notification queued for tutor: ${quiz.createdBy}`);
         }

         return createdQuizSubmission;
      } catch (error) {
         console.error("Error in submitShortAnswer:", error);
         throw error;
      }
   }

   async getSubmitMCQList(userId: string): Promise<IQuizSubmission[]> {
      const list = await quizSubmissionModel
         .find({ studentId: userId })
         .populate({
            path: "quizId",
            match: { quizType: "MULTIPLE_CHOICE" },
            select: "title description quizMode quizType totalQuestions",
         })
         .populate({ path: "studentId", select: "name email -_id" })
         .populate({
            path: "answers.questionId",
            select:
               "-_id order questionText options correctAnswer explanation points",
         });
      return list.filter((submission) => submission.quizId !== null);
   }

   async getSubmitShortAnswerList(userId: string): Promise<IQuizSubmission[]> {
      const list = await quizSubmissionModel
         .find({ studentId: userId })
         .populate({
            path: "quizId",
            match: { quizType: QuestionTypeEnum.SHORT_ANSWER },
            select: "title description quizMode quizType totalQuestions",
         })
         .populate({ path: "studentId", select: "name email -_id" })
         .populate({
            path: "answers.questionId",
            select:
               "-_id order questionText acceptedAnswers caseSensitive explanation points",
         });
      return list.filter((submission) => submission.quizId !== null);
   }

   async getSubmitMCQ(quizId: string): Promise<IQuizSubmission> {
      const mcq = await quizSubmissionModel
         .findOne({
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

   async getSubmitShortAnswer(quizId: string): Promise<IQuizSubmission> {
      const saq = await quizSubmissionModel
         .findOne({
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
               "-_id order questionText acceptedAnswers caseSensitive explanation points",
         });
      if (!saq) {
         throw new NotFoundError("not found this quiz submission");
      }
      return saq;
   }

   async attempt(
      studentId: string,
      sessionId: string
   ): Promise<IQuizAttempt[]> {
      const session = await sessionModel.findById(sessionId);
      if (!session) {
         throw new NotFoundError("can not find this session");
      }

      // Combine both MCQ and Short Answer quiz IDs
      const mcqQuizIds = Array.isArray((session as any).mcqQuizIds)
         ? (session as any).mcqQuizIds
         : [];
      const saqQuizIds = Array.isArray((session as any).saqQuizIds)
         ? (session as any).saqQuizIds
         : [];

      const allQuizIds = [...mcqQuizIds, ...saqQuizIds];
      if (allQuizIds.length === 0) return [];

      const studentSubmissions = await quizSubmissionModel
         .find({
            studentId: studentId,
            quizId: { $in: allQuizIds },
         })
         .select("_id quizId");

      const grouped = new Map<string, Types.ObjectId[]>();
      studentSubmissions.forEach((s: any) => {
         const qid = String(s.quizId);
         const sid = s._id as Types.ObjectId;
         if (!grouped.has(qid)) grouped.set(qid, []);
         grouped.get(qid)!.push(sid);
      });

      const result: IQuizAttempt[] = allQuizIds.map((q: any) => {
         const key = String(q);
         const subIds = grouped.get(key) ?? [];
         return {
            quizId: q,
            attempt: subIds.length,
            submissionIds: subIds,
         } as unknown as IQuizAttempt;
      });

      return result;
   }

   async studentSubmissions(userId: string) {
      const tutorId = await tutorModel.exists({ userId });
      const students = await teachingRequestModel
         .find({ tutorId: tutorId })
         .select("studentId -_id");
      if (!students) {
         throw new NotFoundError("u dont have any student ");
      }

      const studentIds = students.map((s) => new Types.ObjectId(s.studentId));

      const users = await studentModel
         .find({
            _id: { $in: studentIds },
         })
         .select("userId -_id");

      const userIds = users.map((u) => new Types.ObjectId(u.userId));

      const subs = await quizSubmissionModel
         .find({
            studentId: { $in: userIds },
         })
         .populate({
            path: "studentId",
            select: "name email",
         })
         .select("-answers")
         .populate({
            path: "quizId",
            select:
               "title description quizMode quizType totalQuestions createdAt updatedAt tags",
         });
      if (!subs) {
         throw new NotFoundError("can not found any submission");
      }

      return subs;
   }

   async getStudentShortAnswerSubmissions(userId: string) {
      const tutorId = await tutorModel.exists({ userId });
      const students = await teachingRequestModel
         .find({ tutorId: tutorId })
         .select("studentId -_id");
      if (!students) {
         throw new NotFoundError("u dont have any student ");
      }

      const studentIds = students.map((s) => new Types.ObjectId(s.studentId));

      const users = await studentModel
         .find({
            _id: { $in: studentIds },
         })
         .select("userId -_id");

      const userIds = users.map((u) => new Types.ObjectId(u.userId));

      const subs = await quizSubmissionModel
         .find({
            studentId: { $in: userIds },
         })
         .populate({
            path: "quizId",
            match: { quizType: QuestionTypeEnum.SHORT_ANSWER },
         })
         .populate({
            path: "studentId",
            select: "name email",
         })
         .select("-answers");

      return subs.filter((submission) => submission.quizId !== null);
   }
}

export default new doQuizService();
