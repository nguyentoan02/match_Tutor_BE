import mongoose, {
   ClientSession,
   MongooseBulkWriteResult,
   Types,
} from "mongoose";
import quizModel from "../models/quiz.model";
import quizQuestionModel from "../models/quizQuestion.model";
import {
   CreateMultipleChoiceQuizBody,
   DeleteFlashCardQuestion,
   DeleteMultipleChoiceQuestion,
   EditFlashCardQuestion,
   EditMultipleChoiceQuestion,
   FlashCardQuestionType,
   MultipleChoiceQuestionType,
} from "../schemas/quiz.schema";
import { IQuiz, IQuizInfo } from "../types/types/quiz";
import {
   BadRequestError,
   InternalServerError,
   NotFoundError,
} from "../utils/error.response";
import { IQuizQuestionInfo } from "../types/types/quizQuestion";
import sessionModel from "../models/session.model";
import { QuestionTypeEnum } from "../types/enums";
import { ISession } from "../types/types/session";

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

   async getFlashcardQuizesByTutor(tutorId: string): Promise<IQuiz[]> {
      const quizes = await quizModel.find({
         createdBy: tutorId,
         quizType: QuestionTypeEnum.FLASHCARD,
      });
      if (quizes.length === 0) {
         new NotFoundError("can not find any quiz from this tutor");
      }
      return quizes as IQuiz[];
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

   private async editFlashcardQuiz(
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

   private async updateQuizFlashcardQuestions(
      tutorId: string,
      quizId: string,
      editQuestionArr: EditFlashCardQuestion[] = [],
      session?: ClientSession
   ): Promise<MongooseBulkWriteResult> {
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

         const updateQueries = editQuestionArr.map((q) => {
            const qAny: any = q as any;
            return {
               updateOne: {
                  filter: { _id: qAny._id, quizId },
                  update: { $set: qAny },
                  options: { new: true, session: s },
               },
            };
         });

         if (updateQueries.length) {
            await quizQuestionModel.bulkWrite(updateQueries, { session: s });
         }
         return Promise.resolve({} as MongooseBulkWriteResult);
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
   ): Promise<MongooseBulkWriteResult> {
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

   private async addFlashcardQuizQuestionToQuiz(
      tutorId: string,
      quizId: string,
      newQuestionArr: FlashCardQuestionType[] = [],
      session?: ClientSession
   ): Promise<MongooseBulkWriteResult> {
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

         const insertQueries = newQuestionArr.map((p) => {
            return {
               insertOne: {
                  document: { quizId, ...p },
               },
            };
         });

         if (insertQueries.length) {
            await quizQuestionModel.bulkWrite(insertQueries, { session: s });
         }

         return Promise.resolve({} as MongooseBulkWriteResult);
      } catch (error) {
         if (ownSession) await s.abortTransaction();
         throw error;
      } finally {
         if (ownSession) s.endSession();
      }
   }

   async editFlashcardQuizCombined(
      tutorId: string,
      quizAtr: Record<string, any>,
      editQuestionArr: EditFlashCardQuestion[] = [],
      newQuestionArr: FlashCardQuestionType[] = [],
      deleteQuestionArr: DeleteFlashCardQuestion[] = []
   ): Promise<IQuiz> {
      const session = await mongoose.startSession();
      try {
         session.startTransaction();

         const quiz = await this.editFlashcardQuiz(tutorId, quizAtr, session);

         const quizId = quizAtr._id;

         await Promise.all([
            this.updateQuizFlashcardQuestions(
               tutorId,
               quizId,
               editQuestionArr,
               session
            ),
            this.deleteQuestionsFromQuiz(
               tutorId,
               quizId,
               deleteQuestionArr,
               session
            ),
            this.addFlashcardQuizQuestionToQuiz(
               tutorId,
               quizId,
               newQuestionArr,
               session
            ),
         ]);

         const finalQuestions = await quizQuestionModel
            .find({ quizId })
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
         console.error("Edit quiz error:", error);
         throw new BadRequestError("can not edit this quiz");
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

   async createMultipleChoiceQuiz(
      tutorId: string,
      quizAtr: IQuizInfo,
      questionArr: MultipleChoiceQuestionType[]
   ): Promise<IQuiz> {
      const session = await mongoose.startSession();
      try {
         session.startTransaction();
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
            throw new Error("Failed to create quiz");
         }

         const createdQuiz = createdQuizArr[0];

         const questionPayload = questionArr.map((q) => ({
            quizId: createdQuiz._id,
            ...q,
         }));

         for (let q of questionPayload) {
            if (q.options && !q.options.includes(q.correctAnswer)) {
               throw new BadRequestError(
                  "correct answer must be one of the options"
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
            "can not create multiple choice quiz and quiz questions"
         );
      } finally {
         session.endSession();
      }
   }

   async getMultipleChoiceQuizByQuizId(
      quizId: string
   ): Promise<IQuizQuestionInfo> {
      const multipleChoiceQuiz = await quizModel.findById(quizId);
      if (!multipleChoiceQuiz)
         throw new NotFoundError("can not found this quiz");
      const quizQuestions = await quizQuestionModel.find({
         quizId: quizId,
         questionType: QuestionTypeEnum.MULTIPLE_CHOICE,
      });
      if (quizQuestions.length === 0) {
         throw new NotFoundError(
            "this quiz dosen't have any question please add more"
         );
      }
      const payload: IQuizQuestionInfo = {
         quizInfo: multipleChoiceQuiz,
         quizQuestions,
      };
      return payload;
   }

   private async addNewMultipleChoiceQuestions(
      tutorId: string,
      quizId: string,
      newQuestions: MultipleChoiceQuestionType[],
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
            throw new NotFoundError("can not found this quiz to add question");

         const insertQueries = newQuestions.map((p) => {
            if (p.options && !p.options.includes(p.correctAnswer)) {
               throw new BadRequestError(
                  "correct answer must be one of the options"
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
         throw new BadRequestError("can not update this quiz question");
      } finally {
         if (ownSession) s.endSession();
      }
   }

   private async updateMultipleChoiceQuestions(
      tutorId: string,
      quizId: string,
      editQuestions: EditMultipleChoiceQuestion[],
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
            throw new NotFoundError("can not found this quiz to update");

         for (const q of editQuestions || []) {
            const qAny: any = q as any;
            if (qAny.options && !qAny.options.includes(qAny.correctAnswer)) {
               throw new BadRequestError(
                  "correct answer must be one of the options"
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
         throw new BadRequestError("can not update this quiz question");
      } finally {
         if (ownSession) s.endSession();
      }
   }

   async editMultipleChoiceQuizCombined(
      tutorId: string,
      quizArt: IQuizInfo,
      newMultipleChoiceQuestions: MultipleChoiceQuestionType[],
      editMultipleChoiceQuestions: EditMultipleChoiceQuestion[],
      deleteMultipleChoiceQuestions: DeleteMultipleChoiceQuestion[]
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
               "can not found this quiz and update this quiz"
            );
         }
         const quizId = quizArt._id;

         if (!quizId) {
            throw new BadRequestError("quiz id is required");
         }

         await Promise.all([
            this.addNewMultipleChoiceQuestions(
               tutorId,
               quizId.toString(),
               newMultipleChoiceQuestions,
               session
            ),
            this.updateMultipleChoiceQuestions(
               tutorId,
               quizId.toString(),
               editMultipleChoiceQuestions,
               session
            ),
            this.deleteQuestionsFromQuiz(
               tutorId,
               quizId.toString(),
               deleteMultipleChoiceQuestions,
               session
            ),
         ]);

         const finalQuestions = await quizQuestionModel
            .find({ quizId: quizId })
            .session(session);

         quiz.totalQuestions = finalQuestions.length;
         await quiz.save({ session });
         await session.commitTransaction();
         return { quiz, quizQuestions: finalQuestions } as unknown as IQuiz;
      } catch (error) {
         await session.abortTransaction();
         throw new BadRequestError("can not edit this quiz");
      } finally {
         session.endSession();
      }
   }

   async AsignQuizToSession(
      tutorId: string,
      quizIds: string[],
      sessionId: string
   ): Promise<ISession> {
      const session = await sessionModel.findById(sessionId);
      if (!session) {
         throw new NotFoundError("can not find this session");
      }

      if (session.createdBy.toString() !== tutorId) {
         throw new BadRequestError("you are not allowed to edit this session");
      }

      session.quizzes.push(...quizIds.map((id) => new Types.ObjectId(id)));
      await session.save();
      return session as ISession;
   }

   async getMultipleChoiceQuizesByTutor(tutorId: string): Promise<IQuiz[]> {
      const quizes = await quizModel.find({
         createdBy: tutorId,
         quizType: QuestionTypeEnum.MULTIPLE_CHOICE,
      });
      if (quizes.length === 0) {
         new NotFoundError("can not find any quiz from this tutor");
      }
      return quizes as IQuiz[];
   }
}

export default new QuizService();
