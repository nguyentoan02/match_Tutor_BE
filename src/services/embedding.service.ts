import tutorModel from "../models/tutor.model";
import {
   addEmbeddingJob,
   clearEmbeddingQueue,
   getQueueStats,
} from "../queues/embedding.queue";
import { ITutor } from "../types/types/tutor";
import { embedding } from "../utils/embedding.util";

class embeddingService {
   async all(): Promise<void> {
      const tutorIds = await tutorModel.find({}).select("userId");
      console.log(tutorIds);
      for (const t of tutorIds) {
         await addEmbeddingJob(t.userId.toString());
      }
   }

   async clearQueue(): Promise<boolean> {
      return await clearEmbeddingQueue();
   }

   async getStats() {
      return await getQueueStats();
   }

   async searchTutorsByVector(
      query: string,
      limit: number = 10
   ): Promise<ITutor[]> {
      try {
         const queryVector = await embedding(query);

         // if (process.env.MONGODB_ATLAS_VECTOR_SEARCH === "true") {
         // return await this.atlasVectorSearch(queryVector, limit);
         // }

         return await this.manualVectorSearch(queryVector, limit);
      } catch (error) {
         console.error("Vector search error:", error);
         throw error;
      }
   }

   /**
    * MongoDB Atlas Vector Search (recommended)
    */
   // private async atlasVectorSearch(queryVector: number[], limit: number) {
   //    const pipeline = [
   //       {
   //          $vectorSearch: {
   //             index: "tutorEmbeddingIndex",
   //             path: "embedding",
   //             queryVector: queryVector,
   //             numCandidates: limit * 10,
   //             limit: limit,
   //          },
   //       },
   //       {
   //          $match: { isApproved: true },
   //       },
   //       {
   //          $project: {
   //             userId: 1,
   //             subjects: 1,
   //             levels: 1,
   //             bio: 1,
   //             hourlyRate: 1,
   //             ratings: 1,
   //             score: { $meta: "vectorSearchScore" },
   //          },
   //       },
   //    ];

   //    return await tutorModel.aggregate(pipeline);
   // }

   /**
    * Manual vector search với cosine similarity
    */
   private async manualVectorSearch(
      queryVector: number[],
      limit: number
   ): Promise<ITutor[]> {
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
            ? this.cosineSimilarity(queryVector, tutor.embedding)
            : 0,
      }));

      const filteredResults = results.filter(
         (result) => result.similarity > 0.55
      );

      // Sắp xếp theo similarity và lấy top results
      const sortedResult = filteredResults
         .sort((a, b) => b.similarity - a.similarity)
         .slice(0, limit)
         .map(({ embedding, ...rest }) => rest);

      return sortedResult;
   }

   /**
    * Tính cosine similarity giữa 2 vector
    */
   private cosineSimilarity(vecA: number[], vecB: number[]): number {
      if (vecA.length !== vecB.length) return 0;

      const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
      const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
      const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));

      return magnitudeA && magnitudeB
         ? dotProduct / (magnitudeA * magnitudeB)
         : 0;
   }
}

export default new embeddingService();
