import { Queue } from "bullmq";
import { connection } from "../config/redis";

export const matchingQueue = new Queue("matchQueue", { connection });

export async function addMatchJob(studentId: string) {
   console.log(studentId)
   await matchingQueue.add(
      "matchProfile",
      { studentId },
      {
         attempts: 3,
         backoff: { type: "exponential", delay: 5000 },
         delay: 0,
      }
   );
   console.log(`Added matching job for userId ${studentId}`);
}
