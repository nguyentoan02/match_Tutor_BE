import mongoose, { ClientSession, Types } from "mongoose";
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
import { IQuizQuestion, IQuizQuestionInfo } from "../types/types/quizQuestion";
import sessionModel from "../models/session.model";
import { QuestionTypeEnum } from "../types/enums";

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
            createdQuestions = (await quizQuestionModel.insertMany(payload, {
               session: s,
            })) as unknown as IQuizQuestion[];
         }

         const finalQuestions = await quizQuestionModel
            .find({ quizId })
            .session(s);

         if (ownSession) await s.commitTransaction();
         return createdQuestions;
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

         await this.updateQuizFlashcardQuestions(
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
   ) {
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
         for (let q of newQuestions || []) {
            const qAny: any = q as any;
            if (qAny.options && !qAny.options.includes(qAny.correctAnswer)) {
               throw new BadRequestError(
                  "correct answer must be one of the options"
               );
            }
         }
         await quizQuestionModel.insertMany(newQuestions, { session: s });
         if (ownSession) await s.commitTransaction();
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
   ) {
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
         for (const q of editQuestions || []) {
            const qAny: any = q as any;
            await quizQuestionModel.findOneAndUpdate(
               { _id: qAny._id, quizId },
               { $set: qAny },
               { new: true, session: s }
            );
         }
         if (ownSession) await s.commitTransaction();
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

         // add new questions
         if (newMultipleChoiceQuestions.length > 0)
            await this.addNewMultipleChoiceQuestions(
               tutorId,
               quizId.toString(),
               newMultipleChoiceQuestions,
               session
            );
         // update questions
         if (editMultipleChoiceQuestions.length > 0)
            await this.updateMultipleChoiceQuestions(
               tutorId,
               quizId.toString(),
               editMultipleChoiceQuestions,
               session
            );
         // delete questions
         if (deleteMultipleChoiceQuestions.length > 0)
            await quizQuestionModel.deleteMany(
               {
                  _id: { $in: deleteMultipleChoiceQuestions },
                  quizId: quizId,
               },
               { session }
            );

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
}

export default new QuizService();
