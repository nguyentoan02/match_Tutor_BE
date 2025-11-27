import IORedis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) throw new Error("Redis environment variables are not set!");

const redisOptions = {
   maxRetriesPerRequest: null,
   enableReadyCheck: false,
};

// Primary connection reused by BullMQ
export const connection = new IORedis(REDIS_URL, redisOptions);

// Dedicated clients for pub/sub to avoid interference with BullMQ
export const redisPublisher = new IORedis(REDIS_URL, redisOptions);
export const redisSubscriber = new IORedis(REDIS_URL, redisOptions);

connection.on("connect", () => console.log("Connected to Redis Cloud"));
connection.on("error", (err) => console.error("Redis connection error:", err));

redisPublisher.on("error", (err) =>
   console.error("Redis publisher connection error:", err)
);
redisSubscriber.on("error", (err) =>
   console.error("Redis subscriber connection error:", err)
);
