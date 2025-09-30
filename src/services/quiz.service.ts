import mongoose, { ClientSession } from "mongoose";
import quizModel from "../models/quiz.model";
import quizQuestionModel from "../models/quizQuestion.model";
import {
   DeleteFlashCardQuestion,
   EditFlashCardQuestion,
   FlashCardQuestionType,
} from "../schemas/quiz.schema";
import { IQuiz } from "../types/types/quiz";
import {
   BadRequestError,
   InternalServerError,
   NotFoundError,
} from "../utils/error.response";
import { IQuizQuestion, IQuizQuestionInfo } from "../types/types/quizQuestion";
import sessionModel from "../models/session.model";

class QuizService {
   async createQuiz(
      tutorId: string,
      quizAtr: Record<string, any>,
      questionArr: FlashCardQuestionType[]
   ): Promise<IQuiz> {
      const session = await mongoose.startSession();
      try {
         session.startTransaction();
         const createdQuiz = await quizModel.create(
            [
               {
                  ...quizAtr,
                  createdBy: tutorId,
               },
            ],
            { session }
         );
         if (!createdQuiz || !createdQuiz.length) {
            throw new Error("Failed to create quiz");
         }
         const quizDoc = createdQuiz[0];

         const questionsPayload = questionArr.map((q) => ({
            quizId: quizDoc._id,
            ...q,
         }));

         const createdQuestions = await quizQuestionModel.insertMany(
            questionsPayload,
            { session }
         );

         quizDoc.totalQuestions = createdQuestions.length;
         await quizDoc.save({ session });

         await session.commitTransaction();
         session.endSession();

         return {
            ...(quizDoc.toObject ? quizDoc.toObject() : (quizDoc as any)),
            quizQuestions: createdQuestions,
         } as unknown as IQuiz;
      } catch (error) {
         await session.abortTransaction();
         session.endSession();
         throw new InternalServerError(
            "can not create quiz and quiz questions"
         );
      }
   }

   async getQuizesByTutor(tutorId: string): Promise<IQuiz[]> {
      const quizes = await quizModel.find({ createdBy: tutorId });
      if (quizes.length === 0) {
         new NotFoundError("can not find any quiz from this tutor");
      }
      return quizes as IQuiz[];
   }

   async getQuizQuestionByQuiz(quizId: string): Promise<IQuizQuestionInfo> {
      const quiz = await quizModel
         .findById(quizId)
         .populate({ path: "createdBy", select: "name -_id role" });
      if (!quiz) throw new NotFoundError("can not found this quiz");
      const quizQuestions = await quizQuestionModel.find({ quizId: quizId });
      if (quizQuestions.length === 0) {
         throw new NotFoundError(
            "this quiz dosen't have any question please add more"
         );
      }
      const payload: IQuizQuestionInfo = { quizInfo: quiz, quizQuestions };
      return payload;
   }

   private async editQuiz(
      tutorId: string,
      quizAtr: Record<string, any>,
      session?: ClientSession
   ): Promise<IQuiz> {
      const ownSession = !session;
      const s = session || (await mongoose.startSession());
      try {
         if (ownSession) s.startTransaction();

         if (!quizAtr._id) new BadRequestError("edit quiz quiz id is required");

         const updatePayload = { ...quizAtr };
         delete updatePayload._id;

         const updatedQuiz = await quizModel.findOneAndUpdate(
            { _id: quizAtr._id, createdBy: tutorId },
            { $set: updatePayload },
            { new: true, session: s }
         );

         if (!updatedQuiz)
            throw new NotFoundError("Quiz not found or not permitted");

         if (ownSession) {
            await s.commitTransaction();
            return updatedQuiz.toObject
               ? updatedQuiz.toObject()
               : (updatedQuiz as any);
         }

         return updatedQuiz.toObject
            ? updatedQuiz.toObject()
            : (updatedQuiz as any);
      } catch (error) {
         if (ownSession) {
            await s.abortTransaction();
         }
         throw error;
      } finally {
         if (ownSession) s.endSession();
      }
   }

   private async updateQuizQuestions(
      tutorId: string,
      quizId: string,
      editQuestionArr: EditFlashCardQuestion[] = [],
      session?: ClientSession
   ): Promise<IQuizQuestion[]> {
      const ownSession = !session;
      const s = session || (await mongoose.startSession());
      try {
         if (ownSession) s.startTransaction();

         if (!quizId) throw new NotFoundError("update quiz id is required");
         const quizDoc = await quizModel
            .findOne({ _id: quizId, createdBy: tutorId })
            .session(s);
         if (!quizDoc)
            throw new NotFoundError("quiz not found or not permitted");

         for (const q of editQuestionArr || []) {
            const qAny: any = q as any;
            await quizQuestionModel.findOneAndUpdate(
               { _id: qAny._id, quizId },
               { $set: qAny },
               { new: true, session: s }
            );
         }

         const finalQuestions = await quizQuestionModel
            .find({ quizId })
            .session(s);
         quizDoc.totalQuestions = finalQuestions.length;
         await quizDoc.save({ session: s });

         if (ownSession) await s.commitTransaction();
         return finalQuestions;
      } catch (error) {
         if (ownSession) await s.abortTransaction();
         throw error;
      } finally {
         if (ownSession) s.endSession();
      }
   }

   private async deleteQuestionsFromQuiz(
      tutorId: string,
      quizId: string,
      deleteQuestionArr: DeleteFlashCardQuestion[] = [],
      session?: ClientSession
   ): Promise<void> {
      const ownSession = !session;
      const s = session || (await mongoose.startSession());
      try {
         if (ownSession) s.startTransaction();

         if (!quizId) throw new NotFoundError("delete quiz id is required");
         const quizDoc = await quizModel
            .findOne({ _id: quizId, createdBy: tutorId })
            .session(s);
         if (!quizDoc)
            throw new NotFoundError("quiz not found or not permitted");

         await quizQuestionModel.deleteMany(
            { _id: { $in: deleteQuestionArr }, quizId },
            { session: s }
         );

         const finalQuestions = await quizQuestionModel
            .find({ quizId })
            .session(s);
         quizDoc.totalQuestions = finalQuestions.length;
         await quizDoc.save({ session: s });

         if (ownSession) await s.commitTransaction();
      } catch (error) {
         if (ownSession) await s.abortTransaction();
         throw error;
      } finally {
         if (ownSession) s.endSession();
      }
   }

   private async addQuizQuestionToQuiz(
      tutorId: string,
      quizId: string,
      newQuestionArr: FlashCardQuestionType[] = [],
      session?: ClientSession
   ): Promise<IQuizQuestion[]> {
      const ownSession = !session;
      const s = session || (await mongoose.startSession());
      try {
         if (ownSession) s.startTransaction();

         if (!quizId) throw new NotFoundError("add quiz id is required");
         const quizDoc = await quizModel
            .findOne({ _id: quizId, createdBy: tutorId })
            .session(s);
         if (!quizDoc)
            throw new NotFoundError("quiz not found or not permitted");

         const payload = (newQuestionArr || []).map((q) => ({ quizId, ...q }));
         let createdQuestions: IQuizQuestion[] = [];
         if (payload.length) {
            createdQuestions = await quizQuestionModel.insertMany(payload, {
               session: s,
            });
         }

         const finalQuestions = await quizQuestionModel
            .find({ quizId })
            .session(s);
         quizDoc.totalQuestions = finalQuestions.length;
         await quizDoc.save({ session: s });

         if (ownSession) await s.commitTransaction();
         return createdQuestions;
      } catch (error) {
         if (ownSession) await s.abortTransaction();
         throw error;
      } finally {
         if (ownSession) s.endSession();
      }
   }

   async editQuizCombined(
      tutorId: string,
      quizAtr: Record<string, any>,
      editQuestionArr: EditFlashCardQuestion[] = [],
      newQuestionArr: FlashCardQuestionType[] = [],
      deleteQuestionArr: DeleteFlashCardQuestion[] = []
   ): Promise<IQuiz> {
      const session = await mongoose.startSession();
      try {
         session.startTransaction();

         const quiz = await this.editQuiz(tutorId, quizAtr, session);

         const quizId = quizAtr._id;

         await this.updateQuizQuestions(
            tutorId,
            quizId,
            editQuestionArr,
            session
         );

         await this.deleteQuestionsFromQuiz(
            tutorId,
            quizId,
            deleteQuestionArr,
            session
         );

         await this.addQuizQuestionToQuiz(
            tutorId,
            quizId,
            newQuestionArr,
            session
         );

         const finalQuestions = await quizQuestionModel
            .find({ quizId })
            .session(session);

         await session.commitTransaction();
         return { quiz, quizQuestions: finalQuestions } as unknown as IQuiz;
      } catch (error) {
         await session.abortTransaction();
         throw error;
      } finally {
         session.endSession();
      }
   }

   async deleteQuiz(quizId: string, userId: string): Promise<void> {
      const quiz = await quizModel.findOne({ _id: quizId, createdBy: userId });
      if (!quiz) {
         throw new NotFoundError("can not find this quiz");
      }

      const quizQuestions = await quizQuestionModel.find({
         quizId: quizId,
      });
      if (quizQuestions.length < 1) {
         throw new NotFoundError("can not find quiz question in this quiz");
      }

      const existed = await sessionModel
         .findOne({ quizIds: quizId })
         .lean()
         .select("_id")
         .exec();
      if (existed) {
         new BadRequestError("please remove this quiz from all the session");
      }

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

         await quizModel.deleteOne({ _id: quizId }, { session });
         await session.commitTransaction();
      } catch (error) {
         await session.abortTransaction();
         throw new InternalServerError("can not delete this quiz");
      } finally {
         session.endSession();
      }
   }
}

export default new QuizService();
