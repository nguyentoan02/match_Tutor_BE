import { Request, Response } from "express";
import { BadRequestError, UnauthorizedError } from "../utils/error.response";
import {
    CreateShortAnswerQuizBody,
    editShortAnswerQuizBody,
} from "../schemas/quiz.schema";
import shortAnswerQuizService from "../services/shortAnswerQuiz.service";
import { OK } from "../utils/success.response";
import { QuestionTypeEnum } from "../types/enums";

class ShortAnswerQuizController {
    async CreateShortAnswerQuiz(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
        }
        const createQuiz: CreateShortAnswerQuizBody = req.body;
        const createdQuiz = await shortAnswerQuizService.createShortAnswerQuiz(
            currentUser._id.toString(),
            {
                title: createQuiz.title,
                description: createQuiz.description,
                settings: createQuiz.settings,
                tags: createQuiz.tags,
                quizMode: createQuiz.quizMode,
                quizType: QuestionTypeEnum.SHORT_ANSWER,
            },
            createQuiz.questionArr
        );
        new OK({ message: "create short answer quiz success", metadata: createdQuiz }).send(
            res
        );
    }

    async GetShortAnswerQuizByQuizId(req: Request, res: Response) {
        const { quizId } = req.query;
        if (!quizId) throw new BadRequestError("invalid quizId");
        const quizQuestions = await shortAnswerQuizService.getShortAnswerQuizByQuizId(
            quizId.toString()
        );
        new OK({
            message: "get short answer quiz by quizId success",
            metadata: quizQuestions,
        }).send(res);
    }

    async editShortAnswerQuizByTutor(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
        }
        const editQuiz: editShortAnswerQuizBody = req.body;
        const editedQuiz = await shortAnswerQuizService.editShortAnswerQuizCombined(
            currentUser._id.toString(),
            {
                _id: editQuiz._id,
                title: editQuiz.title,
                description: editQuiz.description,
                settings: editQuiz.settings,
                tags: editQuiz.tags,
                quizMode: editQuiz.quizMode,
                quizType: QuestionTypeEnum.SHORT_ANSWER,
            },
            editQuiz.newShortAnswerQuizQuestionsArr ?? [],
            editQuiz.editShortAnswerQuizQuestionsArr ?? [],
            editQuiz.deleteShortAnswerQuizQuestionsArr ?? []
        );
        new OK({ message: "edit short answer quiz success", metadata: editedQuiz }).send(res);
    }

    async GetShortAnswerQuizesByTutor(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
        }
        const quizes = await shortAnswerQuizService.getShortAnswerQuizesByTutor(
            currentUser._id.toString()
        );
        new OK({ message: "get short answer quizes success", metadata: quizes }).send(res);
    }
    async DeleteShortAnswerQuiz(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
        }
        const { quizId } = req.body;
        await shortAnswerQuizService.deleteShortAnswerQuiz(
            quizId,
            currentUser._id.toString()
        );
        new OK({ message: "delete short answer quiz success" }).send(res);
    }


    async AsignShortAnswerQuizToSession(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
        }

        const { quizIds, sessionId } = req.body;

        if (!quizIds || !sessionId) {
            throw new BadRequestError("quizIds and sessionId are required");
        }

        const session = await shortAnswerQuizService.asignShortAnswerQuizToSession(
            currentUser._id.toString(),
            Array.isArray(quizIds) ? quizIds : [quizIds],
            sessionId.toString()
        );

        new OK({
            message: "assign short answer quiz to session success",
            metadata: session
        }).send(res);
    }

    async getShortAnswerQuizzesInSessionDetail(req: Request, res: Response) {
        const { sessionId } = req.query;

        if (!sessionId) {
            throw new BadRequestError("sessionId is required");
        }

        const quizzes = await shortAnswerQuizService.getShortAnswerQuizzesInSessionDetail(
            sessionId.toString()
        );

        new OK({
            message: "get short answer quizzes in session detail success",
            metadata: quizzes,
        }).send(res);
    }

}

export default new ShortAnswerQuizController();