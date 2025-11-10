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

class ShortAnswerQuizService {
    async createShortAnswerQuiz(
        tutorId: string,
        quizAtr: IQuizInfo,
        questionArr: ShortAnswerQuestionType[]
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

            for (const q of questionPayload) {
                const { acceptedAnswers } = q;
                if (!acceptedAnswers || acceptedAnswers.length === 0) {
                    throw new BadRequestError(
                        "at least one accepted answer is required for short answer question"
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
                "can not create short answer quiz and quiz questions"
            );
        } finally {
            session.endSession();
        }
    }

    async getShortAnswerQuizByQuizId(quizId: string): Promise<IQuizQuestionInfo> {
        const shortAnswerQuiz = await quizModel.findById(quizId);
        if (!shortAnswerQuiz)
            throw new NotFoundError("can not found this quiz");
        const quizQuestions = await quizQuestionModel.find({
            quizId: quizId,
            questionType: QuestionTypeEnum.SHORT_ANSWER,
        });
        if (quizQuestions.length === 0) {
            throw new NotFoundError(
                "this quiz dosen't have any question please add more"
            );
        }
        const payload: IQuizQuestionInfo = {
            quizInfo: shortAnswerQuiz,
            quizQuestions,
        };
        return payload;
    }

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
                throw new NotFoundError("can not found this quiz to add question");

            const insertQueries = newQuestions.map((p) => {
                const { acceptedAnswers } = p;
                if (!acceptedAnswers || acceptedAnswers.length === 0) {
                    throw new BadRequestError(
                        "at least one accepted answer is required for short answer question"
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
                throw new NotFoundError("can not found this quiz to update");

            for (const q of editQuestions) {
                const { acceptedAnswers } = q;
                if (!acceptedAnswers || acceptedAnswers.length === 0) {
                    throw new BadRequestError(
                        "at least one accepted answer is required for short answer question"
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
                    "can not found this quiz and update this quiz"
                );
            }
            const quizId = quizArt._id;

            if (!quizId) {
                throw new BadRequestError("quiz id is required");
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
            console.log("Edit quiz error:", error);
            throw new BadRequestError("can not edit this quiz");
        } finally {
            session.endSession();
        }
    }

    async getShortAnswerQuizesByTutor(tutorId: string): Promise<IQuiz[]> {
        const quizes = await quizModel.find({
            createdBy: tutorId,
            quizType: QuestionTypeEnum.SHORT_ANSWER,
        });
        if (quizes.length === 0) {
            new NotFoundError("can not find any quiz from this tutor");
        }
        return quizes as IQuiz[];
    }

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

    async deleteShortAnswerQuiz(quizId: string, userId: string): Promise<void> {
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
            .find({ quizIds: quizId })
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

            if (existed) {
                await sessionModel.updateMany(
                    { quizIds: quizId },
                    { $pull: { quizIds: quizId } },
                    { session }
                );
            }

            await quizModel.deleteOne({ _id: quizId }, { session });
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw new InternalServerError("can not delete this short answer quiz");
        } finally {
            session.endSession();
        }
    }

    async asignShortAnswerQuizToSession(
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

    async getShortAnswerQuizzesInSessionDetail(sessionId: string): Promise<IQuiz[]> {
        const session = await sessionModel.findById(sessionId);
        if (!session) {
            throw new NotFoundError("can not find this session");
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

}

export default new ShortAnswerQuizService();