import { Router } from "express";
import embeddingController from "../controllers/embedding.controller";

const router = Router()

router.get("/all", embeddingController.embedAll)

router.delete("/clear", embeddingController.clearQueue)

router.get("/stats", embeddingController.getQueueStats)

router.get("/search", embeddingController.searchVector)

export default router