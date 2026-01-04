import { Router } from "express";
import controller from "../controllers/session.controller";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validation.middleware";
import {
   createSessionSchema,
   updateSessionSchema,
   cancelSessionSchema,
   confirmAttendanceSchema,
   rejectAttendanceSchema,
   createManySessionSchema,
} from "../schemas/session.schema";
import { Role } from "../types/enums/role.enum";

const router = Router();

// Tất cả các route trong file này đều yêu cầu đăng nhập
router.use(authenticate, isRole(Role.STUDENT, Role.TUTOR));

// Lấy tất cả session của user hiện tại (student hoặc tutor)
router.get("/me", controller.listForUser);

// NEW: Lấy các session REJECTED & soft-deleted của user hiện tại
router.get("/me/deleted", controller.listDeletedForUser);

// NEW: Lấy các session CANCELLED của user hiện tại
router.get("/me/cancelled", controller.listCancelledForUser);

// NEW: Lấy các buổi học vắng của user
router.get("/me/absences", controller.listAbsenceSessionsForUser);

// Tạo một session mới cho một learning commitment
// router.post("/", validate(createSessionSchema), controller.create);
router.get("/busy",controller.getBusy)

// Lấy chi tiết một session
router.get("/:id", controller.getById);

// Cập nhật một session
router.patch("/:id", validate(updateSessionSchema), controller.update);

// Xóa một session
router.delete("/:id", controller.delete);

// Student confirms participation in session
router.patch(
   "/:sessionId/confirm-participation",
   isRole(Role.STUDENT),
   controller.confirmParticipation
);

// Cancel a confirmed session
router.patch(
   "/:sessionId/cancel",
   validate(cancelSessionSchema),
   controller.cancel
);

// Both tutor and student confirm attendance after session
router.patch(
   "/:sessionId/confirm-attendance",
   validate(confirmAttendanceSchema),
   controller.confirmAttendance
);

// Both tutor and student confirm attendance after session
router.patch(
   "/:sessionId/confirm-attendance-fake",
   validate(confirmAttendanceSchema),
   controller.confirmAttendanceFake
);

// Both tutor and student can reject attendance after session
router.patch(
   "/:sessionId/reject-attendance",
   validate(rejectAttendanceSchema),
   controller.rejectAttendance
);

router.patch(
   "/:sessionId/reject-attendance-fake",
   validate(rejectAttendanceSchema),
   controller.rejectAttendanceFake
);

// Lấy tất cả session của một learning commitment
router.get("/commitment/:commitmentId", controller.getSessionsByCommitmentId);

router.post("/batch", validate(createManySessionSchema), controller.createMany);

export default router;
