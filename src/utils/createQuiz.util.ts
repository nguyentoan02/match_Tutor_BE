import axios from "axios";
import { IQuizBody } from "../types/types/aiCreateQuizResponse";
import client from "../config/openAI";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { quizPrompts } from "./promt.util";

const execAsync = promisify(exec);

export type QuizType = "FLASHCARD" | "MULTIPLE_CHOICE" | "SHORT_ANSWER";

interface GenerateQuizOptions {
   fileUrl: string;
   type: QuizType;
}

export async function generateQuizFromFileFlexible({
   fileUrl,
   type,
}: GenerateQuizOptions): Promise<IQuizBody> {
   try {
      const response = await axios.get(fileUrl, {
         responseType: "arraybuffer",
         timeout: 30000,
      });

      console.log(`📄 Downloaded file (${response.statusText})`);

      const tempDir = path.join(__dirname, "../temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempFilePath = path.join(tempDir, `temp_${Date.now()}.pdf`);
      fs.writeFileSync(tempFilePath, Buffer.from(response.data));

      const { stdout } = await execAsync(`pdftotext "${tempFilePath}" -`);
      fs.unlinkSync(tempFilePath);
      const fileText = stdout;

      if (!fileText || fileText.trim().length < 50)
         throw new Error("Could not extract sufficient text from file.");

      const prompt = quizPrompts[type];
      if (!prompt) throw new Error(`Unsupported quiz type: ${type}`);

      const completion = await client.chat.completions.create({
         model: "gpt-4o",
         messages: [
            { role: "system", content: prompt.system },
            { role: "user", content: prompt.user(fileText) },
         ],
         response_format: { type: "json_object" },
         temperature: 0.7,
         max_tokens: 6000,
      });

      const message = completion.choices[0].message?.content;
      if (!message) throw new Error("Empty response from OpenAI.");

      const quiz = JSON.parse(message);

      if (!quiz.title || !quiz.questionArr || !Array.isArray(quiz.questionArr))
         throw new Error("Invalid quiz structure returned from OpenAI.");

      quiz.totalQuestions = quiz.questionArr.length;
      quiz.createdAt = new Date();
      quiz.updatedAt = new Date();

      console.log(
         `✅ Successfully generated ${type} quiz with ${quiz.totalQuestions} questions.`
      );

      return quiz;
   } catch (error: any) {
      console.error("Error generating quiz:", error.message);

      if (fs.existsSync(path.join(__dirname, "../temp"))) {
         fs.rmSync(path.join(__dirname, "../temp"), {
            recursive: true,
            force: true,
         });
      }

      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED")
         throw new Error("Cannot reach file URL. Please check accessibility.");
      if (error.response?.status === 404)
         throw new Error("File not found at provided URL.");
      if (error.response?.status === 413) throw new Error("File is too large.");
      if (error.message?.includes("JSON"))
         throw new Error("Invalid JSON response from OpenAI.");

      throw new Error(error.message || "Failed to generate quiz from file.");
   }
}
