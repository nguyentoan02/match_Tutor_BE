import mongoose, {
   ClientSession,
   MongooseBulkWriteResult,
   Types,
} from "mongoose";
import quizModel from "../models/quiz.model";
import quizQuestionModel from "../models/quizQuestion.model";
import {
   CreateShortAnswerQuizBody,
   DeleteShortAnswerQuestion,
   EditShortAnswerQuestion,
   ShortAnswerQuestionType,
} from "../schemas/quiz.schema";
import { IQuiz, IQuizInfo } from "../types/types/quiz";
import {
   BadRequestError,
   InternalServerError,
   NotFoundError,
} from "../utils/error.response";
import { IQuizQuestion, IQuizQuestionInfo } from "../types/types/quizQuestion";
import sessionModel from "../models/session.model";
import { QuestionTypeEnum } from "../types/enums";
import { ISession } from "../types/types/session";
import quizSubmissionModel from "../models/quizSubmission.model";
import tutorModel from "../models/tutor.model";

class ShortAnswerQuizService {
   // Tạo bài quiz tự luận mới
   async createShortAnswerQuiz(
      tutorId: string,
      quizAtr: IQuizInfo,
      questionArr: ShortAnswerQuestionType[]
   ): Promise<IQuiz> {
      const session = await mongoose.startSession();
      try {
         session.startTransaction();

         const tutor = await tutorModel.findOne({ userId: tutorId });

         if (!tutor) throw new NotFoundError("Không tìm thấy gia sư");

         if (tutor.maxQuiz === 0)
            throw new BadRequestError("Đã đạt giới hạn số lượng quiz được tạo");

         tutor.maxQuiz = Math.max(0, tutor.maxQuiz - 1);

         await tutor.save({ session });

         const createdQuizArr = await quizModel.create(
            [
               {
                  ...quizAtr,
                  createdBy: tutorId,
               },
            ],
            { session }
         );

         if (!createdQuizArr || !createdQuizArr.length) {
            throw new Error("Không thể tạo quiz");
         }

         const createdQuiz = createdQuizArr[0];

         const questionPayload = questionArr.map((q) => ({
            quizId: createdQuiz._id,
            ...q,
         }));

         for (const q of questionPayload) {
            const { acceptedAnswers } = q;
            if (!acceptedAnswers || acceptedAnswers.length === 0) {
               throw new BadRequestError(
                  "Câu hỏi tự luận cần ít nhất một đáp án chấp nhận được"
               );
            }
         }

         const insertedQuestions = await quizQuestionModel.insertMany(
            questionPayload,
            { session }
         );

         createdQuiz.totalQuestions = insertedQuestions.length;
         await createdQuiz.save({ session });
         await session.commitTransaction();
         session.endSession();

         return {
            ...(createdQuiz.toObject
               ? createdQuiz.toObject()
               : (createdQuiz as any)),
            quizQuestions: insertedQuestions,
         } as unknown as IQuiz;
      } catch (error) {
         await session.abortTransaction();
         throw new InternalServerError(
            "Không thể tạo bài quiz tự luận và câu hỏi"
         );
      } finally {
         session.endSession();
      }
   }

   // Lấy thông tin bài quiz tự luận theo ID
   async getShortAnswerQuizByQuizId(
      quizId: string
   ): Promise<IQuizQuestionInfo> {
      const shortAnswerQuiz = await quizModel.findById(quizId);
      if (!shortAnswerQuiz) throw new NotFoundError("Không tìm thấy bài quiz");

      const quizQuestions = await quizQuestionModel.find({
         quizId: quizId,
         questionType: QuestionTypeEnum.SHORT_ANSWER,
      });

      if (quizQuestions.length === 0) {
         throw new NotFoundError(
            "Bài quiz này chưa có câu hỏi nào, vui lòng thêm câu hỏi"
         );
      }

      const payload: IQuizQuestionInfo = {
         quizInfo: shortAnswerQuiz,
         quizQuestions,
      };
      return payload;
   }

   // Thêm câu hỏi tự luận mới vào quiz
   private async addNewShortAnswerQuestions(
      tutorId: string,
      quizId: string,
      newQuestions: ShortAnswerQuestionType[],
      session?: ClientSession
   ): Promise<MongooseBulkWriteResult> {
      const ownSession = !session;
      const s = session || (await mongoose.startSession());
      try {
         if (ownSession) s.startTransaction();
         const quizDoc = await quizModel.findOne({
            _id: quizId,
            createdBy: tutorId,
         });

         if (!quizDoc)
            throw new NotFoundError("Không tìm thấy bài quiz để thêm câu hỏi");

         const insertQueries = newQuestions.map((p) => {
            const { acceptedAnswers } = p;
            if (!acceptedAnswers || acceptedAnswers.length === 0) {
               throw new BadRequestError(
                  "Câu hỏi tự luận cần ít nhất một đáp án chấp nhận được"
               );
            }

            const pAny = p as any;
            return {
               insertOne: { document: { quizId, ...pAny } },
            };
         });

         if (insertQueries.length)
            return quizQuestionModel.bulkWrite(insertQueries, { session: s });

         return Promise.resolve({} as MongooseBulkWriteResult);
      } catch (error) {
         if (ownSession) await s.abortTransaction();
         throw new BadRequestError("Không thể cập nhật câu hỏi quiz này");
      } finally {
         if (ownSession) s.endSession();
      }
   }

   // Cập nhật câu hỏi tự luận đã có
   private async updateShortAnswerQuestions(
      tutorId: string,
      quizId: string,
      editQuestions: EditShortAnswerQuestion[],
      session?: ClientSession
   ): Promise<MongooseBulkWriteResult> {
      const ownSession = !session;
      const s = session || (await mongoose.startSession());
      try {
         if (ownSession) s.startTransaction();
         const quizDoc = await quizModel.findOne({
            _id: quizId,
            createdBy: tutorId,
         });

         if (!quizDoc)
            throw new NotFoundError("Không tìm thấy bài quiz để cập nhật");

         for (const q of editQuestions) {
            const { acceptedAnswers } = q;
            if (!acceptedAnswers || acceptedAnswers.length === 0) {
               throw new BadRequestError(
                  "Câu hỏi tự luận cần ít nhất một đáp án chấp nhận được"
               );
            }
         }

         const updateQueries = editQuestions.map((q) => {
            const qAny: any = q as any;
            return {
               updateOne: {
                  filter: { _id: qAny._id, quizId },
                  update: { $set: qAny },
                  upsert: false,
               },
            };
         });

         if (updateQueries.length) {
            return quizQuestionModel.bulkWrite(updateQueries, { session: s });
         }

         return Promise.resolve({} as MongooseBulkWriteResult);
      } catch (error) {
         if (ownSession) await s.abortTransaction();
         throw new BadRequestError("Không thể cập nhật câu hỏi quiz này");
      } finally {
         if (ownSession) s.endSession();
      }
   }

   // Chỉnh sửa bài quiz tự luận (thêm, sửa, xóa câu hỏi)
   async editShortAnswerQuizCombined(
      tutorId: string,
      quizArt: IQuizInfo,
      newShortAnswerQuestions: ShortAnswerQuestionType[],
      editShortAnswerQuestions: EditShortAnswerQuestion[],
      deleteShortAnswerQuestions: DeleteShortAnswerQuestion[]
   ) {
      const session = await mongoose.startSession();
      try {
         session.startTransaction();
         const quiz = await quizModel.findOneAndUpdate(
            { _id: quizArt._id, createdBy: tutorId },
            { $set: quizArt },
            { new: true, session }
         );

         if (!quiz) {
            throw new NotFoundError(
               "Không tìm thấy bài quiz này để cập nhật"
            );
         }

         const quizId = quizArt._id;

         if (!quizId) {
            throw new BadRequestError("ID bài quiz là bắt buộc");
         }

         await Promise.all([
            this.addNewShortAnswerQuestions(
               tutorId,
               quizId.toString(),
               newShortAnswerQuestions,
               session
            ),
            this.updateShortAnswerQuestions(
               tutorId,
               quizId.toString(),
               editShortAnswerQuestions,
               session
            ),
            this.deleteQuestionsFromQuiz(
               tutorId,
               quizId.toString(),
               deleteShortAnswerQuestions,
               session
            ),
         ]);

         const finalQuestions = await quizQuestionModel
            .find({ quizId: quizId })
            .session(session);

         quiz.totalQuestions = finalQuestions.length;
         await quizModel.findOneAndUpdate(
            { _id: quizId },
            { $set: { totalQuestions: finalQuestions.length } },
            { session }
         );

         await session.commitTransaction();
         return { quiz, quizQuestions: finalQuestions } as unknown as IQuiz;
      } catch (error) {
         await session.abortTransaction();
         console.log("Lỗi chỉnh sửa quiz:", error);
         throw new BadRequestError("Không thể chỉnh sửa bài quiz này");
      } finally {
         session.endSession();
      }
   }

   // Lấy tất cả quiz tự luận của gia sư
   async getShortAnswerQuizesByTutor(tutorId: string): Promise<IQuiz[]> {
      const quizes = await quizModel.find({
         createdBy: tutorId,
         quizType: QuestionTypeEnum.SHORT_ANSWER,
      });

      if (quizes.length === 0) {
         new NotFoundError("Không tìm thấy bài quiz nào từ gia sư này");
      }

      return quizes as IQuiz[];
   }

   // Xóa câu hỏi từ quiz
   private async deleteQuestionsFromQuiz(
      tutorId: string,
      quizId: string,
      deleteQuestionArr: DeleteShortAnswerQuestion[] = [],
      session?: ClientSession
   ): Promise<MongooseBulkWriteResult> {
      const ownSession = !session;
      const s = session || (await mongoose.startSession());
      try {
         if (ownSession) s.startTransaction();

         if (!quizId) throw new NotFoundError("ID quiz để xóa là bắt buộc");

         const quizDoc = await quizModel
            .findOne({ _id: quizId, createdBy: tutorId })
            .session(s);

         if (!quizDoc)
            throw new NotFoundError("Không tìm thấy quiz hoặc không có quyền");

         const deleteIds = deleteQuestionArr
            .map((q) => q._id)
            .filter((id) => !!id);

         const deleteQueries = deleteIds.map((id) => ({
            deleteOne: { filter: { _id: id, quizId } },
         }));

         if (deleteQueries.length) {
            return quizQuestionModel.bulkWrite(deleteQueries, { session: s });
         }

         return Promise.resolve({} as MongooseBulkWriteResult);
      } catch (error) {
         if (ownSession) await s.abortTransaction();
         throw error;
      } finally {
         if (ownSession) s.endSession();
      }
   }

   // Xóa toàn bộ bài quiz tự luận
   async deleteShortAnswerQuiz(quizId: string, userId: string): Promise<void> {
      const quiz = await quizModel.findOne({ _id: quizId, createdBy: userId });
      if (!quiz) {
         throw new NotFoundError("Không tìm thấy bài quiz này");
      }

      const quizQuestions = await quizQuestionModel.find({
         quizId: quizId,
      });

      if (quizQuestions.length < 1) {
         throw new NotFoundError("Không tìm thấy câu hỏi nào trong bài quiz này");
      }

      const existed = await sessionModel
         .find({ saqQuizIds: quizId })
         .lean()
         .select("_id")
         .exec();

      const deleteIds = quizQuestions
         .map((q: any) => q._id)
         .filter((id) => !!id);

      const session = await mongoose.startSession();
      try {
         session.startTransaction();

         if (deleteIds.length) {
            await quizQuestionModel.deleteMany(
               { _id: { $in: deleteIds }, quizId },
               { session }
            );
         }

         if (existed && existed.length > 0) {
            await sessionModel.updateMany(
               { saqQuizIds: quizId },
               { $pull: { saqQuizIds: quizId } },
               { session }
            );
         }

         // Xóa tất cả bài nộp của quiz này
         await quizSubmissionModel.deleteMany({ quizId }, { session });

         await quizModel.deleteOne({ _id: quizId }, { session });
         await session.commitTransaction();
      } catch (error) {
         await session.abortTransaction();
         throw new InternalServerError("Không thể xóa bài quiz tự luận này");
      } finally {
         session.endSession();
      }
   }

   // Gán quiz tự luận vào buổi học
   async asignShortAnswerQuizToSession(
      tutorId: string,
      quizIds: string[],
      sessionId: string
   ): Promise<ISession> {
      const session = await sessionModel.findById(sessionId);
      if (!session) {
         throw new NotFoundError("Không tìm thấy buổi học này");
      }

      if (session.createdBy.toString() !== tutorId) {
         throw new BadRequestError("Bạn không có quyền chỉnh sửa buổi học này");
      }

      const quizIdsArr = Array.isArray(quizIds)
         ? quizIds.filter((id) => !!id)
         : [];

      const savedSession = await sessionModel.findByIdAndUpdate(
         sessionId,
         { $set: { saqQuizIds: quizIdsArr } },
         { new: true }
      );

      return savedSession as ISession;
   }

   // Lấy danh sách quiz tự luận trong buổi học chi tiết
   async getShortAnswerQuizzesInSessionDetail(
      sessionId: string
   ): Promise<IQuiz[]> {
      const session = await sessionModel.findById(sessionId);
      if (!session) {
         throw new NotFoundError("Không tìm thấy buổi học này");
      }

      const quizIds = session.saqQuizIds;
      if (!quizIds || quizIds.length === 0) {
         return [];
      }

      const quizzes = await quizModel.find({
         _id: { $in: quizIds },
      });

      return quizzes as IQuiz[];
   }

   // Lấy danh sách buổi học được gán quiz tự luận này
   async getSessionsAssignedForSAQ(quizId: string): Promise<ISession[]> {
      const sessions = await sessionModel
         .find({
            saqQuizIds: new Types.ObjectId(quizId),
         })
         .select(
            "-saqQuizIds -createdBy -updatedAt -__v -studentConfirmation -attendanceConfirmation -cancellation -isDeleted -deletedAt -deletedBy -materials -reminders -location -notes"
         )
         .populate({
            path: "teachingRequestId",
            select: "title subject level studentId",
            populate: {
               path: "studentId",
               select: "userId",
               populate: {
                  path: "userId",
                  select: "name email ",
               },
            },
         });

      return sessions as ISession[];
   }
}

export default new ShortAnswerQuizService();