import { Router } from "express";
import { authenticate } from "../middlewares/auth.middleware";
import favouriteTutorController from "../controllers/favouriteTutor.controller";
import { validate } from "../middlewares/validation.middleware";
import { favoriteTutorBodySchema } from "../schemas/favoriteTutor.schema";

const router = Router();

router.get(
   "/getMyFavoriteTutor",
   authenticate,
   favouriteTutorController.getMyFavoriteTutor
);

router.post(
   "/addFavoriteTutor",
   authenticate,
   validate(favoriteTutorBodySchema),
   favouriteTutorController.addFavoriteTutor
);

router.delete(
   "/deleteFavoriteTutor",
   authenticate,
   validate(favoriteTutorBodySchema)
);

export default router;
