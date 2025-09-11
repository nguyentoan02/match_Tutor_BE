import { Router } from "express";
import studentController from "../controllers/student.controller";
import { validate } from "../middlewares/validation.middleware";
import { createStudentProfileSchema } from "../schemas/StudentProfile.schema";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.post(
    "/createProfile",
    authenticate,
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
    authenticate,
    studentController.updateUserProfile
);

export default router;
