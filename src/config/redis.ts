import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) throw new Error("Redis environment variables are not set!");

export const connection = new IORedis(REDIS_URL, {
   maxRetriesPerRequest: null,
   enableReadyCheck: false,
});

connection.on("connect", () => console.log("Connected to Redis Cloud"));
connection.on("error", (err) => console.error("Redis connection error:", err));
