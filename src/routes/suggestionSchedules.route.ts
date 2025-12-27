import { Router } from "express";
import suggestionSchedulesController from "../controllers/suggestionSchedules.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post("/create", authenticate, suggestionSchedulesController.create);

export default router;
