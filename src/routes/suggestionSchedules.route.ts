import { Router } from "express";
import suggestionSchedulesController from "../controllers/suggestionSchedules.controller";
import { authenticate } from "../middlewares/auth.middleware";
// import { SuggestionSchedulesBodySchema } from "../schemas/suggestionSchedule.schema";
// import { validate } from "../middlewares/validation.middleware";

const router = Router();

router.post(
   "/create",
   authenticate,
   // validate(SuggestionSchedulesBodySchema),
   suggestionSchedulesController.create
);

router.get("/:TRid/get",authenticate,suggestionSchedulesController.getByTRId);

export default router;
