import express from "express";
import tutorController from "../controllers/tutor.controller";
import { createTutorProfileSchema, updateTutorProfileSchema } from "../schemas/tutor.schema";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import { uploadFields } from "../middlewares/upload.middleware";
import { Role } from "../types/enums";
import { parseJsonFields } from "../middlewares/jsonfields.moddleware";

const router = express.Router();

router.get("/me",
    authenticate,
    isRole(Role.TUTOR),
    tutorController.getMyTutorProfile
);
router.post(
    "/profile",
    authenticate,
    isRole(Role.TUTOR),
    uploadFields([
        { name: "avatar", maxCount: 1 },
        { name: "certificationImages", maxCount: 10 },
    ]),
    parseJsonFields,
    validate(createTutorProfileSchema),
    tutorController.createTutorProfile
);

router.put(
    "/profile",
    authenticate,
    isRole(Role.TUTOR),
    uploadFields([
        { name: "avatar", maxCount: 1 },
        { name: "certificationImages", maxCount: 20 },
    ]),
    parseJsonFields,
    validate(updateTutorProfileSchema),
    tutorController.updateTutorProfile
);

router.get("/:id", tutorController.getTutorById);
router.get("/",
    tutorController.getAllTutors);


router.delete(
    "/certifications/:certificationIndex/images/:imageIndex",
    tutorController.deleteCertificationImage
);

export default router;