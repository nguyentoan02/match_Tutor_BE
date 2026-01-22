import { Worker } from "bullmq";
import { connection } from "../config/redis";
import { embedding, translate } from "../utils/embedding.util";
import mongoose from "mongoose";
import studentModel from "../models/student.model";
import { IStudent } from "../types/types/student";
import aiRecommendationModel from "../models/aiRecommendation.model";
import tutorModel from "../models/tutor.model";
import "../models/user.model";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) throw new Error("Please input mongoURI");

mongoose
   .connect(MONGO_URI)
   .then(() => console.log("✅ Worker connected to MongoDB"))
   .catch((err) => console.error("❌ Worker MongoDB connection error:", err));

const worker = new Worker(
   "matchQueue",
   async (job) => {
      console.log(`Running match for tutor: ${job.data.studentId}`);
      const user = await studentModel.findOne({ userId: job.data.studentId });
      if (!user) {
         console.warn(
            `No student found for userId ${job.data.userId}, skipping job ${job.id}`
         );
         return;
      }
      const userData = {
         levels: user.gradeLevel,
         learningGoals: user.learningGoals,
         subjects: user.subjectsInterested,
      };

      const textembeding = JSON.stringify(userData);

      const textEmbedTranslated = await translate(textembeding);

      const embeddingVector = await embedding(textEmbedTranslated!);

      const tutors = await manualVectorSearch(embeddingVector, 3);

      const tutorIds = tutors.map((t) => {
         return { tutorId: t._id };
      });

      const result = await aiRecommendationModel.findOneAndUpdate(
         {
            studentId: user._id,
         },
         {
            recommendedTutors: [...tutorIds],
         }
      );

      if (!result) {
         await aiRecommendationModel.create({
            studentId: user._id,
            recommendedTutors: [...tutorIds],
         });
      }
   },
   { connection, concurrency: 5 }
);

const manualVectorSearch = async (queryVector: number[], limit: number) => {
   const tutors = await tutorModel
      .find({
         isApproved: true,
         embedding: { $exists: true, $not: { $size: 0 } },
      })
      .populate({
         path: "userId",
         select: "name gender address.city avatarUrl",
      })
      .lean();

   // Tính cosine similarity
   const results = tutors.map((tutor) => ({
      ...tutor,
      similarity: Array.isArray(tutor.embedding)
         ? cosineSimilarity(queryVector, tutor.embedding)
         : 0,
   }));

   console.log(results);

   const filteredResults = results.filter((result) => result.similarity > 0.64);

   // Sắp xếp theo similarity và lấy top results
   const sortedResult = filteredResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit)
      .map(({ embedding, ...rest }) => rest);

   return sortedResult;
};

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
   if (vecA.length !== vecB.length) return 0;

   const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
   const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
   const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

   return magnitudeA && magnitudeB ? dotProduct / (magnitudeA * magnitudeB) : 0;
};

// Log status
worker.on("completed", (job) =>
   console.log(`🎉 Job matching ${job.id} completed!`)
);
worker.on("failed", (job, err) =>
   console.error(`Job matching ${job?.id} failed:`, err)
);

export default worker;
