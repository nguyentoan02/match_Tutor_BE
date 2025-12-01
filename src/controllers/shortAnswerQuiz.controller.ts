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
            throw new UnauthorizedError("Chưa được xác thực");
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
        new OK({
            message: "Tạo bài quiz trả lời ngắn thành công",
            metadata: createdQuiz
        }).send(res);
    }

    async GetShortAnswerQuizByQuizId(req: Request, res: Response) {
        const { quizId } = req.query;
        if (!quizId) throw new BadRequestError("quizId không hợp lệ");

        const quizQuestions = await shortAnswerQuizService.getShortAnswerQuizByQuizId(
            quizId.toString()
        );

        new OK({
            message: "Lấy quiz trả lời ngắn theo quizId thành công",
            metadata: quizQuestions,
        }).send(res);
    }

    async editShortAnswerQuizByTutor(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Chưa được xác thực");
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

        new OK({
            message: "Chỉnh sửa quiz trả lời ngắn thành công",
            metadata: editedQuiz
        }).send(res);
    }

    async GetShortAnswerQuizesByTutor(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Chưa được xác thực");
        }

        const quizes = await shortAnswerQuizService.getShortAnswerQuizesByTutor(
            currentUser._id.toString()
        );

        new OK({
            message: "Lấy danh sách quiz trả lời ngắn thành công",
            metadata: quizes
        }).send(res);
    }

    async DeleteShortAnswerQuiz(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Chưa được xác thực");
        }

        const { quizId } = req.body;

        await shortAnswerQuizService.deleteShortAnswerQuiz(
            quizId,
            currentUser._id.toString()
        );

        new OK({ message: "Xóa quiz trả lời ngắn thành công" }).send(res);
    }

    async AsignShortAnswerQuizToSession(req: Request, res: Response) {
        const currentUser = req.user;
        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Chưa được xác thực");
        }

        const { quizIds, sessionId } = req.body;

        if (!quizIds || !sessionId) {
            throw new BadRequestError("quizIds và sessionId là bắt buộc");
        }

        const session = await shortAnswerQuizService.asignShortAnswerQuizToSession(
            currentUser._id.toString(),
            Array.isArray(quizIds) ? quizIds : [quizIds],
            sessionId.toString()
        );

        new OK({
            message: "Gán quiz trả lời ngắn vào buổi học thành công",
            metadata: session
        }).send(res);
    }

    async getShortAnswerQuizzesInSessionDetail(req: Request, res: Response) {
        const { sessionId } = req.query;

        if (!sessionId) {
            throw new BadRequestError("sessionId là bắt buộc");
        }

        const quizzes = await shortAnswerQuizService.getShortAnswerQuizzesInSessionDetail(
            sessionId.toString()
        );

        new OK({
            message: "Lấy chi tiết quiz trả lời ngắn trong buổi học thành công",
            metadata: quizzes,
        }).send(res);
    }

    async getSessionsAssignedForSAQ(req: Request, res: Response) {
        const { quizId } = req.query;

        if (!quizId) {
            throw new BadRequestError("quizId là bắt buộc");
        }

        const sessions = await shortAnswerQuizService.getSessionsAssignedForSAQ(
            quizId.toString()
        );

        new OK({
            message: "Lấy danh sách buổi học đã gán quiz trả lời ngắn thành công",
            metadata: sessions,
        }).send(res);
    }

}

export default new ShortAnswerQuizController();