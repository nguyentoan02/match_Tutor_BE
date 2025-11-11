import axios from "axios";
import { IQuizBody } from "../types/types/aiCreateQuizResponse";
import client from "../config/openAI";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

/**
 * Tải file từ R2 và upload lên OpenAI để tạo quiz JSON
 * @param fileUrl Link public của file (pdf, docx, txt, ...)
 */
export async function generateQuizFromFile(
   fileUrl: string
): Promise<IQuizBody> {
   try {
      // Download file
      const response = await axios.get(fileUrl, {
         responseType: "arraybuffer",
         timeout: 30000,
      });

      console.log(response.statusText);

      // Save to temp file
      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) {
         fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFilePath = path.join(tempDir, `temp_${Date.now()}.pdf`);
      fs.writeFileSync(tempFilePath, Buffer.from(response.data));

      // Extract text using pdftotext (requires poppler-utils installed)
      try {
         const { stdout } = await execAsync(`pdftotext "${tempFilePath}" -`);
         const fileText = stdout;

         console.log(fileText);

         // Clean up temp file
         fs.unlinkSync(tempFilePath);

         if (!fileText || fileText.trim().length < 50) {
            throw new Error("Could not extract text from PDF");
         }

         // Send extracted text to OpenAI
         const completion = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
               {
                  role: "system",
                  content: `Bạn là một chuyên gia tạo quiz flashcard. Hãy tạo flashcard dựa trên nội dung tài liệu được cung cấp.

Quy tắc bắt buộc:
1. Tạo ít nhất 3 flashcard, tối đa 10 flashcard
2. Tất cả nội dung phải bằng tiếng Việt
3. Chỉ trả về JSON object hợp lệ theo cấu trúc sau:

{
  "title": "Tiêu đề quiz bằng tiếng Việt dựa trên nội dung",
  "description": "Mô tả ngắn gọn bằng tiếng Việt",
  "quizMode": "STUDY",
  "settings": {
    "shuffleQuestions": true,
    "showCorrectAnswersAfterSubmit": false,
    "timeLimitMinutes": 0
  },
  "tags": ["từ", "khóa", "liên", "quan"],
  "totalQuestions": 0,
  "questionArr": [
    {
      "order": 1,
      "questionType": "FLASHCARD",
      "frontText": "Thuật ngữ hoặc câu hỏi bằng tiếng Việt",
      "backText": "Định nghĩa hoặc giải thích bằng tiếng Việt",
      "explanation": "Giải thích thêm bằng tiếng Việt (nếu cần)",
    }
  ]
}

Lưu ý: Phải tạo đủ ít nhất 3 flashcard từ nội dung tài liệu.`,
               },
               {
                  role: "user",
                  content: `Hãy phân tích nội dung tài liệu sau và tạo flashcard bằng tiếng Việt với ít nhất 3 câu:

${fileText.substring(0, 10000)}

Yêu cầu:
- Trích xuất các khái niệm, định nghĩa, công thức quan trọng
- Tạo flashcard có frontText là thuật ngữ/câu hỏi, backText là định nghĩa/đáp án
- Tất cả nội dung phải bằng tiếng Việt
- Đảm bảo có ít nhất 3 flashcard`,
               },
            ],
            response_format: { type: "json_object" },
            temperature: 0.7,
            max_tokens: 6000,
         });

         const message = completion.choices[0].message?.content;
         if (!message) {
            throw new Error("Empty response from OpenAI");
         }

         console.log("🤖 OpenAI Response received");

         const quiz = JSON.parse(message);

         // Validate the response structure
         if (
            !quiz.title ||
            !quiz.questionArr ||
            !Array.isArray(quiz.questionArr)
         ) {
            throw new Error("Invalid quiz structure returned from OpenAI");
         }

         // Update totalQuestions to match actual array length
         quiz.totalQuestions = quiz.questionArr.length;
         quiz.createdAt = new Date();
         quiz.updatedAt = new Date();

         console.log(
            "✅ Successfully generated quiz with",
            quiz.questionArr.length,
            "questions"
         );

         return quiz;
      } catch (pdfError) {
         // Clean up temp file on error
         if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
         }
         throw pdfError;
      }
   } catch (error: any) {
      console.error("❌ Error generating quiz:", error);

      // More specific error messages
      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
         throw new Error(
            "Could not connect to file URL. Please check if the URL is accessible."
         );
      }

      if (error.response?.status === 404) {
         throw new Error("File not found at the provided URL.");
      }

      if (error.response?.status === 413) {
         throw new Error("File is too large for OpenAI API.");
      }

      if (error.message?.includes("OpenAI")) {
         throw new Error("OpenAI API error: " + error.message);
      }

      if (error.message?.includes("JSON")) {
         throw new Error("Failed to parse OpenAI response. Please try again.");
      }

      throw new Error(error.message || "Failed to generate quiz from file.");
   }
}

// Remove the local text processing functions since we're using OpenAI now
