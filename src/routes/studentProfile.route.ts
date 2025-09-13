import { Router } from "express";
import studentController from "../controllers/student.controller";
import { validate } from "../middlewares/validation.middleware";
import {
   createStudentProfileSchema,
   updateStudentProfileSchema,
} from "../schemas/StudentProfile.schema";
import { authenticate } from "../middlewares/auth.middleware";
import { uploadSingle } from "../middlewares/upload.middleware";
import { parseJsonFields } from "../middlewares/jsonfields.moddleware";

const router = Router();

router.post(
   "/createProfile",
   authenticate,
   uploadSingle("avatar"),
   parseJsonFields,
   validate(createStudentProfileSchema),
   studentController.createProfile
);

router.get(
   "/readStudentProfile",
   authenticate,
   studentController.readUserProile
);

router.put(
   "/updateStudentProfile",
   uploadSingle("avatar"),
   parseJsonFields,
   validate(updateStudentProfileSchema),
   authenticate,
   studentController.updateUserProfile
);

export default router;
