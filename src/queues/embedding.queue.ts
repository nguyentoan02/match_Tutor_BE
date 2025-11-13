import { Queue } from "bullmq";
import { connection } from "../config/redis";

export const embeddingQueue = new Queue("embeddingQueue", { connection });

export async function addEmbeddingJob(userId: string) {
   await embeddingQueue.add(
      "embedTutorProfile",
      { userId },
      {
         attempts: 3,
         backoff: { type: "exponential", delay: 5000 },
         delay: 0
      }
   );
   console.log(`Added embedding job for userId ${userId}`);
}

export async function clearEmbeddingQueue() {
   try {
      await embeddingQueue.drain();
      await embeddingQueue.clean(0, 1000, "completed");
      await embeddingQueue.clean(0, 1000, "failed");
      await embeddingQueue.clean(0, 1000, "active");

      console.log(`Embedding queue cleared successfully`);
      return true;
   } catch (error) {
      console.error(`Error clearing embedding queue:`, error);
      throw error;
   }
}

export async function getQueueStats() {
   try {
      const waiting = await embeddingQueue.getWaiting();
      const active = await embeddingQueue.getActive();
      const completed = await embeddingQueue.getCompleted();
      const failed = await embeddingQueue.getFailed();

      return {
         waiting: waiting.length,
         active: active.length,
         completed: completed.length,
         failed: failed.length,
         total:
            waiting.length + active.length + completed.length + failed.length,
      };
   } catch (error) {
      console.error(`Error getting queue stats:`, error);
      throw error;
   }
}
