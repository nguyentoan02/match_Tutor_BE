export enum QuizModeEnum {
   STUDY = "STUDY",
   PRACTICE = "PRACTICE",
   EXAM = "EXAM",
}

export enum CardOrderEnum {
   FRONT = "FRONT",
   BACK = "BACK",
}

export enum QuestionTypeEnum {
   MULTIPLE_CHOICE = "MULTIPLE_CHOICE",
   SHORT_ANSWER = "SHORT_ANSWER",
   FLASHCARD = "FLASHCARD",
}

export const QUIZ_MODE_VALUES = Object.values(QuizModeEnum) as QuizModeEnum[];
export const CARD_ORDER_VALUES = Object.values(
   CardOrderEnum
) as CardOrderEnum[];
export const QUESTION_TYPE_VALUES = Object.values(
   QuestionTypeEnum
) as QuestionTypeEnum[];
