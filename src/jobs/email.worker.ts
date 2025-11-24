import { Worker } from "bullmq";
import { connection } from "../config/redis";
import { transporter } from "../config/mail";

const worker = new Worker(
   "emailQueue",
   async (job) => {
      console.log(`Processing email job ${job.id}`);
      const { mailOptions } = job.data;

      // Thực hiện gửi mail
      await transporter.sendMail(mailOptions);

      console.log(`Email sent successfully to ${mailOptions.to}`);
   },
   { connection }
);

worker.on("completed", (job) =>
   console.log(`🎉 Email Job ${job.id} completed!`)
);
worker.on("failed", (job, err) =>
   console.error(`Email Job ${job?.id} failed:`, err)
);

export default worker;
