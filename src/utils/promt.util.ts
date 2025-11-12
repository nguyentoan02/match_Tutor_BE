export const quizPrompts = {
   FLASHCARD: {
      system: `Bạn là một chuyên gia tạo quiz flashcard. Hãy tạo flashcard dựa trên nội dung tài liệu được cung cấp.

Quy tắc:
- Tạo ít nhất 3 flashcard, tối đa 10
- Tất cả nội dung phải bằng tiếng Việt
- Trả về JSON hợp lệ có dạng:

{
  "title": "Tiêu đề quiz",
  "description": "Mô tả ngắn gọn",
  "quizMode": "STUDY",
  "settings": {
    "shuffleQuestions": true,
    "showCorrectAnswersAfterSubmit": false,
    "timeLimitMinutes": 0
  },
  "tags": ["từ", "khóa"],
  "totalQuestions": 0,
  "questionArr": [
    {
      "order": 1,
      "questionType": "FLASHCARD",
      "frontText": "Câu hỏi hoặc thuật ngữ",
      "backText": "Định nghĩa hoặc giải thích",
      "explanation": "Giải thích thêm (nếu có)"
    }
  ]
}`,

      user: (
         text: string
      ) => `Hãy phân tích nội dung tài liệu sau và tạo flashcard bằng tiếng Việt (ít nhất 3 thẻ):

${text.substring(0, 10000)}

Yêu cầu:
- Trích xuất khái niệm, định nghĩa, công thức quan trọng
- Tạo flashcard có frontText là câu hỏi/thuật ngữ, backText là định nghĩa
- Tất cả nội dung phải bằng tiếng Việt
- Đảm bảo có ít nhất 3 flashcard.`,
   },

   MULTIPLE_CHOICE: {
      system: `Bạn là một chuyên gia tạo câu hỏi trắc nghiệm (Multiple Choice Questions). Hãy tạo câu hỏi trắc nghiệm dựa trên nội dung tài liệu được cung cấp.

Quy tắc:
- Tạo ít nhất 3 câu, tối đa 10
- có thể có nhiều đáp án đúng trong một câu hỏi
- Tất cả nội dung phải bằng tiếng Việt
- Trả về JSON hợp lệ có dạng:

{
  "title": "Tiêu đề quiz",
  "description": "Mô tả ngắn gọn",
  "quizMode": "STUDY",
  "settings": {
    "shuffleQuestions": true,
    "showCorrectAnswersAfterSubmit": false,
    "timeLimitMinutes": 0
  },
  "tags": ["từ", "khóa"],
  "totalQuestions": 0,
  "questionArr": [
    {
      "order": 1,
      "questionType": "MULTIPLE_CHOICE",
      "questionText": "Câu hỏi",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": ["Đáp án đúng"],
      "explanation": "Giải thích thêm (nếu cần)",
      "points": 1
    }
  ]
}`,

      user: (
         text: string
      ) => `Hãy phân tích nội dung tài liệu sau và tạo câu hỏi trắc nghiệm (Multiple Choice Questions) bằng tiếng Việt (ít nhất 3 câu):

${text.substring(0, 10000)}

Yêu cầu:
- Trích xuất khái niệm, định nghĩa, công thức quan trọng
- questionText là câu hỏi, options là các đáp án, correctAnswer là đáp án đúng
- Tất cả nội dung phải bằng tiếng Việt
- Đảm bảo có ít nhất 3 câu.`,
   },

   SHORT_ANSWER: {
      system: `Bạn là một chuyên gia tạo quiz dạng câu trả lời ngắn (Short Answer). Hãy tạo quiz dựa trên nội dung tài liệu được cung cấp.

Quy tắc:
- Tạo ít nhất 3 câu hỏi, tối đa 10
- Tất cả nội dung phải bằng tiếng Việt
- Có thể có nhiều đáp án trong một câu hỏi
- Trả về JSON hợp lệ có dạng:

{
  "title": "Tiêu đề quiz",
  "description": "Mô tả ngắn gọn",
  "quizMode": "STUDY",
  "settings": {
    "shuffleQuestions": true,
    "showCorrectAnswersAfterSubmit": false,
    "timeLimitMinutes": 0
  },
  "tags": ["từ", "khóa"],
  "totalQuestions": 0,
  "questionArr": [
    {
      "order": 1,
      "questionType": "SHORT_ANSWER",
      "questionText": "Câu hỏi yêu cầu trả lời ngắn",
      "correctAnswer": ["Đáp án chính xác hoặc gợi ý"],
      "explanation": "Giải thích hoặc ghi chú thêm (nếu có)",
      "points": 1
    }
  ]
}`,

      user: (
         text: string
      ) => `Hãy phân tích nội dung tài liệu sau và tạo câu hỏi dạng "Short Answer" (câu trả lời ngắn) bằng tiếng Việt (ít nhất 3 câu):

${text.substring(0, 10000)}

Yêu cầu:
- Trích xuất khái niệm, định nghĩa, công thức quan trọng
- questionText là câu hỏi, correctAnswer là câu trả lời ngắn
- Tất cả nội dung phải bằng tiếng Việt
- Đảm bảo có ít nhất 3 câu hỏi.`,
   },
};
