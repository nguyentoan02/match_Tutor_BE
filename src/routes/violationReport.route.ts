import { Router } from "express";
import multer from "multer";
import violationReportController from "../controllers/violationReport.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
   checkCanReportSchema,
   createViolationReportSchema,
   getViolationReportsSchema,
   getMyReportsSchema,
   updateViolationReportStatusSchema,
} from "../schemas/violationReport.schema";
import { Role } from "../types/enums/role.enum";

const router = Router();

// Multer config cho file upload
const storage = multer.memoryStorage();
const upload = multer({
   storage: storage,
   limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
   fileFilter: (req, file, cb) => {
      // Cho phép tất cả các loại file (ảnh, PDF, video, etc.)
      cb(null, true);
   },
});

// Check if student can report tutor
router.get(
   "/check/:tutorId",
   authenticate,
   isRole(Role.STUDENT),
   validate(checkCanReportSchema),
   violationReportController.checkCanReport
);

// Create violation report (student only)
router.post(
   "/",
   authenticate,
   isRole(Role.STUDENT),
   (req, res, next) => {
      upload.array("evidenceFiles", 10)(req, res, (err) => {
         if (err) {
            // Multer error (file size, file type, etc.)
            if (err instanceof multer.MulterError) {
               if (err.code === "LIMIT_FILE_SIZE") {
                  return res.status(400).json({
                     success: false,
                     status: "fail",
                     message: "File size exceeds 10MB limit",
                     code: 400,
                  });
               }
               if (err.code === "LIMIT_FILE_COUNT") {
                  return res.status(400).json({
                     success: false,
                     status: "fail",
                     message: "Maximum 10 files allowed",
                     code: 400,
                  });
               }
               return res.status(400).json({
                  success: false,
                  status: "fail",
                  message: err.message,
                  code: 400,
               });
            }
            // Other errors (fileFilter errors)
            return res.status(400).json({
               success: false,
               status: "fail",
               message: err.message || "File upload error",
               code: 400,
            });
         }
         next();
      });
   },
   validate(createViolationReportSchema),
   violationReportController.createReport
);

// Get violation reports (admin only)
router.get(
   "/",
   authenticate,
   isRole(Role.ADMIN),
   validate(getViolationReportsSchema),
   violationReportController.getReports
);

// Get my reports (student only - reports that student has created)
router.get(
   "/my-reports",
   authenticate,
   isRole(Role.STUDENT),
   validate(getMyReportsSchema),
   violationReportController.getMyReports
);

// Update violation report status (admin only)
router.patch(
   "/:id/status",
   authenticate,
   isRole(Role.ADMIN),
   validate(updateViolationReportStatusSchema),
   violationReportController.updateReportStatus
);

export default router;


