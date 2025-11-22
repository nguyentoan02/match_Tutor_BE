import { Queue } from "bullmq";
import { connection } from "../config/redis";

export const notificationQueue = new Queue("notificationQueue", { connection });

export async function addNotificationJob(
   userId: string,
   title: string,
   message: string
) {
   await notificationQueue.add(
      "pushNoti",
      { userId, title, message },
      {
         attempts: 3,
         backoff: { type: "exponential", delay: 5000 },
         delay: 0,
      }
   );
   console.log(`Added noti job for userId ${userId}`);
}
