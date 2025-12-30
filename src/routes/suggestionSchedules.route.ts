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

router.get("/:TRid/get", authenticate, suggestionSchedulesController.getByTRId);

// Học sinh phản hồi đề xuất lịch (ACCEPT / REJECT + reason)
router.post(
   "/:id/student-respond",
   authenticate,
   suggestionSchedulesController.studentRespond
);

// Gia sư chỉnh sửa và gửi lại đề xuất lịch
router.put(
   "/:id",
   authenticate,
   suggestionSchedulesController.tutorUpdate
);

// Lấy tất cả suggestion schedules đang pending của gia sư
router.get(
   "/my/pending",
   authenticate,
   suggestionSchedulesController.getMyPendingSuggestions
);

export default router;
