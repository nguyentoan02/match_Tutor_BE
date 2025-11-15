import { Worker } from "bullmq";
import { connection } from "../config/redis";
import tutorModel from "../models/tutor.model";
import { embedding, translate } from "../utils/embedding.util";
import mongoose from "mongoose";

const MONGO_URI = process.env.MONGO_URI;

if(!MONGO_URI) throw new Error("Please input mongoURI")

mongoose
   .connect(MONGO_URI)
   .then(() => console.log("✅ Worker connected to MongoDB"))
   .catch((err) => console.error("❌ Worker MongoDB connection error:", err));


const worker = new Worker(
   "embeddingQueue",
   async (job) => {
      console.log(`Running embedding for tutor: ${job.data.userId}`);

      const userId: string = job.data.userId;

      const tutor = await tutorModel.findOne({ userId });
      if (!tutor) throw new Error("Tutor not found");

      const tutorData = {
         subjects: tutor.subjects,
         levels: tutor.levels,
         education: tutor.education?.map(({...edu}) => ({
            institution: edu.institution,
            degree: edu.degree,
            fieldOfStudy: edu.fieldOfStudy,
            startDate: edu.startDate,
            endDate: edu.endDate,
            description: edu.description
         })),
         certifications: tutor.certifications?.map(({imageUrls, ...rest}) => ({
            name: rest.name,
            description: rest.description
         })),
         experienceYears: tutor.experienceYears,
         bio: tutor.bio,
         availability: tutor.availability,
         ratings: tutor.ratings,
      };
      const textEmbed = JSON.stringify(tutorData);

      const textEmbedTranslated = await translate(textEmbed)

      const embeddingVector = await embedding(textEmbedTranslated!);

      tutor.embedding = embeddingVector;

      await tutor.save();

      console.log("Embedding vector length:", embeddingVector.length);

      console.log(`Embedding completed for ${job.data.userId}`);
   },
   { connection }
);

// Log status
worker.on("completed", (job) => console.log(`🎉 Job ${job.id} completed!`));
worker.on("failed", (job, err) => console.error(`Job ${job?.id} failed:`, err));

export default worker;
