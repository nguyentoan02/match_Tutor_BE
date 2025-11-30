import { Router } from "express";
import multer from "multer";
import * as materialController from "../controllers/material.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums/role.enum";

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
   storage: storage,
   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
   fileFilter: (req, file, cb) => {
      const allowedMimes = [
         "application/pdf",
         "application/msword",
         "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
         "application/vnd.ms-excel",
         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
         "application/vnd.ms-powerpoint",
         "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      ];
      if (allowedMimes.includes(file.mimetype)) {
         cb(null, true);
      } else {
         cb(new Error("Invalid file type."));
      }
   },
});

router.post(
   "/upload",
   authenticate,
   isRole(Role.TUTOR),
   upload.single("material"),
   materialController.uploadMaterial
);

router.get(
   "/",
   authenticate,
   isRole(Role.TUTOR),
   materialController.getMaterials
);

router.post(
   "/sessions/:sessionId",
   authenticate,
   isRole(Role.TUTOR),
   materialController.addMaterialToSession
);

router.delete(
   "/sessions/:sessionId",
   authenticate,
   isRole(Role.TUTOR),
   materialController.removeMaterialFromSession
);

router.get(
   "/sessions/:sessionId/materials",
   authenticate,
   isRole(Role.TUTOR, Role.STUDENT),
   materialController.getMaterialsBySession
);

router.delete(
   "/:materialId",
   authenticate,
   isRole(Role.TUTOR),
   materialController.deleteMaterial
);

export default router;
