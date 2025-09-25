import z from "zod";
import { QuestionTypeEnum, QuizModeEnum } from "../types/enums";

const baseQuestion = z.object({
   order: z.number().int().nonnegative().optional(),
   questionType: z.nativeEnum(QuestionTypeEnum),
   explanation: z.string().optional(),
   points: z.number().min(0).optional(),
});

const flashcardQuestion = baseQuestion.extend({
   questionType: z.literal(QuestionTypeEnum.FLASHCARD),
   frontText: z.string().min(1, "frontText is required for flashcard"),
   backText: z.string().min(1, "backText is required for flashcard"),
});

export const createQuizBodySchema = z.object({
   body: z.object({
      title: z.string().min(1, "title is required"),
      description: z.string("description is required"),
      quizMode: z.nativeEnum(QuizModeEnum, "invalid quiz mode"),
      settings: z
         .object({
            shuffleQuestions: z.boolean().optional(),
            showCorrectAnswersAfterSubmit: z.boolean().optional(),
            timeLimitMinutes: z
               .number()
               .int()
               .nonnegative()
               .nullable()
               .optional(),
         })
         .optional(),
      tags: z.array(z.string()).optional(),
      // only flashcard questions allowed
      questionArr: z
         .array(flashcardQuestion)
         .min(1, "questionArr must contain at least one flashcard"),
   }),
});

export const quizQuerySchema = z.object({
   query: z.object({
      quizId: z.string().regex(/^[0-9a-fA-F]{24}$/, {
         message: "tutorId must be a valid MongoDB ObjectId",
      }),
   }),
});

export const quizTutorIdQuerySchema = z.object({
   query: z.object({
      tutorId: z.string().regex(/^[0-9a-fA-F]{24}$/, {
         message: "tutorId must be a valid MongoDB ObjectId",
      }),
   }),
});

const editFlashcardQuestion = flashcardQuestion.extend({
   _id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "question _id must be a valid ObjectId")
      .optional(),
});

const deleteFlashcardQuestion = z.object({
   _id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "question _id must be a valid ObjectId")
      .optional(),
});

export const editQuizBodySchema = z.object({
   body: z.object({
      _id: z.string(),
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      sessionId: z
         .string()
         .regex(/^[0-9a-fA-F]{24}$/, "sessionId must be a valid ObjectId")
         .optional(),
      quizMode: z.nativeEnum(QuizModeEnum).optional(),
      settings: z
         .object({
            shuffleQuestions: z.boolean().optional(),
            showCorrectAnswersAfterSubmit: z.boolean().optional(),
            timeLimitMinutes: z
               .number()
               .int()
               .nonnegative()
               .nullable()
               .optional(),
         })
         .optional(),
      tags: z.array(z.string()).optional(),
      // optional array of flashcard questions for create/update/delete handling
      editQuestionArr: z.array(editFlashcardQuestion).optional(),
      newQuestionArr: z.array(flashcardQuestion).optional(),
      deleteQuestionArr: z.array(deleteFlashcardQuestion).optional(),
   }),
});

export const deleteQuizBodySchema = z.object({
   body: z.object({
      quizId: z
         .string()
         .regex(/^[0-9a-fA-F]{24}$/, "sessionId must be a valid ObjectId"),
   }),
});

export type DeleteQuizBody = z.infer<typeof deleteQuizBodySchema>["body"];
export type DeleteFlashCardQuestion = z.infer<typeof deleteFlashcardQuestion>;
export type EditFlashCardQuestion = z.infer<typeof editFlashcardQuestion>;
export type EditQuizBody = z.infer<typeof editQuizBodySchema>["body"];
export type quizTutorIdQuery = z.infer<typeof quizTutorIdQuerySchema>["query"];
export type quizQuery = z.infer<typeof quizQuerySchema>["query"];
export type FlashCardQuestionType = z.infer<typeof flashcardQuestion>;
export type CreateQuizBody = z.infer<typeof createQuizBodySchema>["body"];
