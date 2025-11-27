import { Queue } from "bullmq";
import { connection } from "../config/redis";

export const emailQueue = new Queue("emailQueue", { connection });

export async function addEmailJob(mailOptions: any) {
   await emailQueue.add(
      "sendEmail",
      { mailOptions },
      {
         attempts: 3,
         backoff: { type: "exponential", delay: 5000 },
         removeOnComplete: true, // Tự động xóa job khi thành công
         removeOnFail: false,
      }
   );
   console.log(`Added email job to queue for: ${mailOptions.to}`);
}
