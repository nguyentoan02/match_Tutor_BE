import express from "express";
import tutorController from "../controllers/tutor.controller";
import { createTutorProfileSchema, updateTutorProfileSchema } from "../schemas/tutor.schema";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { uploadFields } from "../middlewares/upload.middleware";
import { Role } from "../types/enums";

const router = express.Router();

router.get("/approved", tutorController.getApprovedTutors);
router.get("/me",
    authenticate,
    isRole(Role.TUTOR),
    tutorController.getMyTutorProfile
);
router.get("/:id", tutorController.getTutorById);
router.get("/",
    // authenticate, isRole(Role.ADMIN),
    tutorController.getAllTutors);
router.post(
    "/profile",
    authenticate,
    isRole(Role.TUTOR),
    uploadFields([
        { name: "avatar", maxCount: 1 },
        { name: "certificationImages", maxCount: 10 },
    ]),
    validate(createTutorProfileSchema),
    tutorController.createTutorProfile
);

router.patch(
    "/profile",
    authenticate,
    isRole(Role.TUTOR),
    uploadFields([
        { name: "avatar", maxCount: 1 },
        { name: "certificationImages", maxCount: 10 },
    ]),
    validate(updateTutorProfileSchema),
    tutorController.updateTutorProfile
);

router.delete(
    "/certifications/:certificationIndex/images/:imageIndex",
    tutorController.deleteCertificationImage
);

export default router;