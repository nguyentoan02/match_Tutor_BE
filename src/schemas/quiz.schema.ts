import z from "zod";
import { QuestionTypeEnum, QuizModeEnum } from "../types/enums";

const baseQuestion = z.object({
   order: z.number().int().nonnegative().optional(),
   questionType: z.nativeEnum(QuestionTypeEnum),
   explanation: z.string().optional(),
   quizId: z.string().optional(),
});

const flashcardQuestion = baseQuestion.extend({
   points: z.number().min(0).optional(),
   questionType: z.literal(QuestionTypeEnum.FLASHCARD),
   frontText: z.string().min(1, "frontText is required for flashcard"),
   backText: z.string().min(1, "backText is required for flashcard"),
});

const multipleChoiceQuestion = baseQuestion.extend({
   questionType: z.literal(QuestionTypeEnum.MULTIPLE_CHOICE),
   questionText: z
      .string()
      .min(1, "question text is required for multiple choice"),
   options: z
      .array(z.string())
      .min(2, "at least two options are required for multiple choice"),
   correctAnswer: z
      .array(z.string().min(1, "correctAnswer is required for multiple choice"))
      .min(1, "correct answer is required for multiple choice"),
   points: z.number().min(0, "points must be non-negative").optional(),
});

const shortAnswerQuestion = baseQuestion.extend({
   questionType: z.literal(QuestionTypeEnum.SHORT_ANSWER),
   questionText: z.string().min(1, "question text is required for short answer"),
   acceptedAnswers: z.array(z.string()).min(1, "at least one accepted answer is required"),
   caseSensitive: z.boolean().default(false),
   points: z.number().min(0, "points must be non-negative").optional(),
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

export const createMultipleChoiceQuizBodySchema = z.object({
   body: z.object({
      title: z.string().min(1, "title is required"),
      description: z.string().optional(),
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
      questionArr: z
         .array(multipleChoiceQuestion)
         .min(
            1,
            "questionArr must contain at least one multiple choice question"
         ),
      quizType: z.literal(QuestionTypeEnum.MULTIPLE_CHOICE).optional(),
   }),
});

const editMultipleChoiceQuestion = multipleChoiceQuestion.extend({
   _id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "question _id must be a valid ObjectId")
      .optional(),
});

const deleteMultipleChoiceQuestion = z.object({
   _id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "question _id must be a valid ObjectId")
      .optional(),
});

export const editMultipleChoiceQuizBodySchema = z.object({
   body: z.object({
      _id: z.string(),
      title: z.string().min(1, "title is required"),
      description: z.string().min(1, "description is required"),
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
      // optional array of multiple choice questions for create/update/delete handling
      editMultipleChoiceQuizQuestionsArr: z
         .array(editMultipleChoiceQuestion)
         .optional(),
      newMultipleChoiceQuizQuestionsArr: z
         .array(multipleChoiceQuestion)
         .optional(),
      deleteMultipleChoiceQuizQuestionsArr: z
         .array(deleteMultipleChoiceQuestion)
         .optional(),
   }),
});


export const createShortAnswerQuizBodySchema = z.object({
   body: z.object({
      title: z.string().min(1, "title is required"),
      description: z.string().optional(),
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
      questionArr: z
         .array(shortAnswerQuestion)
         .min(
            1,
            "questionArr must contain at least one short answer question"
         ),
      quizType: z.literal(QuestionTypeEnum.SHORT_ANSWER).optional(),
   }),
});

const editShortAnswerQuestion = shortAnswerQuestion.extend({
   _id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "question _id must be a valid ObjectId")
      .optional(),
});

const deleteShortAnswerQuestion = z.object({
   _id: z
      .string()
      .regex(/^[0-9a-fA-F]{24}$/, "question _id must be a valid ObjectId")
      .optional(),
});

export const editShortAnswerQuizBodySchema = z.object({
   body: z.object({
      _id: z.string(),
      title: z.string().min(1, "title is required"),
      description: z.string().min(1, "description is required"),
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
      editShortAnswerQuizQuestionsArr: z
         .array(editShortAnswerQuestion)
         .optional(),
      newShortAnswerQuizQuestionsArr: z
         .array(shortAnswerQuestion)
         .optional(),
      deleteShortAnswerQuizQuestionsArr: z
         .array(deleteShortAnswerQuestion)
         .optional(),
   }),
});

export const asignQuizToSessionSchema = z.object({
   body: z.object({
      quizIds: z.array(
         z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "quizId must be a valid ObjectId")
      ),
      sessionId: z
         .string()
         .regex(/^[0-9a-fA-F]{24}$/, "sessionId must be a valid ObjectId"),
   }),
});

export type CreateMultipleChoiceQuizBody = z.infer<
   typeof createMultipleChoiceQuizBodySchema
>["body"];
export type DeleteQuizBody = z.infer<typeof deleteQuizBodySchema>["body"];
export type DeleteFlashCardQuestion = z.infer<typeof deleteFlashcardQuestion>;
export type EditFlashCardQuestion = z.infer<typeof editFlashcardQuestion>;
export type EditQuizBody = z.infer<typeof editQuizBodySchema>["body"];
export type quizTutorIdQuery = z.infer<typeof quizTutorIdQuerySchema>["query"];
export type quizQuery = z.infer<typeof quizQuerySchema>["query"];
export type FlashCardQuestionType = z.infer<typeof flashcardQuestion>;
export type CreateQuizBody = z.infer<typeof createQuizBodySchema>["body"];
export type MultipleChoiceQuestionType = z.infer<typeof multipleChoiceQuestion>;
export type EditMultipleChoiceQuestion = z.infer<
   typeof editMultipleChoiceQuestion
>;
export type DeleteMultipleChoiceQuestion = z.infer<
   typeof deleteMultipleChoiceQuestion
>;
export type editMultipleChoiceQuizBody = z.infer<
   typeof editMultipleChoiceQuizBodySchema
>["body"];
export type ShortAnswerQuestionType = z.infer<typeof shortAnswerQuestion>;
export type EditShortAnswerQuestion = z.infer<typeof editShortAnswerQuestion>;
export type DeleteShortAnswerQuestion = z.infer<typeof deleteShortAnswerQuestion>;
export type CreateShortAnswerQuizBody = z.infer<typeof createShortAnswerQuizBodySchema>["body"];
export type editShortAnswerQuizBody = z.infer<typeof editShortAnswerQuizBodySchema>["body"];
export type AsignQuizToSessionBody = z.infer<
   typeof asignQuizToSessionSchema
>["body"];
