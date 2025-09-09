import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";

import { connectDB } from "./config/db";

import { errorHandler } from "./middlewares/error.middleware";
import routeRegistry from "./routes/routeRegistry";

connectDB();

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

// Routes - Sử dụng route registry (tự động đăng ký tất cả routes)
app.use("/api", routeRegistry.getRouter());

// Error handler
app.use(errorHandler);

export default app;
