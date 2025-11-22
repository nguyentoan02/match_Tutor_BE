import mongoose, { Types } from "mongoose";
import { connection } from "../config/redis";
import { Worker } from "bullmq";
import userModel from "../models/user.model";
import { NotFoundError } from "../utils/error.response";
import notificationSocketService from "../socket/notificationSocket";

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) throw new Error("Please input mongoURI");

mongoose
   .connect(MONGO_URI)
   .then(() => console.log("✅ Worker connected to MongoDB"))
   .catch((err) => console.error("❌ Worker MongoDB connection error:", err));

const noti = new Worker(
   "notificationQueue",
   async (job) => {
      try {
         console.log(
            `🔄 Processing notification job for userId: ${job.data.userId}`
         );

         const userId: string = job.data.userId;
         const title: string = job.data.title;
         const message: string = job.data.message;

         // Validate userId format before creating ObjectId
         if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error(`Invalid userId format: ${userId}`);
         }

         const user = await userModel.findById(userId);

         if (!user) {
            throw new NotFoundError(`User not found with userId: ${userId}`);
         }

         await notificationSocketService.sendNotificationToUser(userId, {
            message,
            title,
         });

         console.log(`✅ Notification sent successfully to user: ${userId}`);
      } catch (error) {
         console.error(`❌ Error processing notification job:`, error);
         throw error; // Re-throw to mark job as failed
      }
   },
   {
      connection,
   }
);

noti.on("completed", (job) =>
   console.log(`🎉 Notification job ${job.id} completed successfully!`)
);

noti.on("failed", (job, err) =>
   console.error(`💥 Notification job ${job?.id} failed:`, err.message)
);

export default noti;
