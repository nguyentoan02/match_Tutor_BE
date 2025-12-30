import { Router } from "express";
import learningCommitmentController from "../controllers/learningCommitment.controller";
import { authenticate } from "../middlewares/auth.middleware"; // import middleware

const router = Router();

// Áp dụng auth cho tất cả routes
router.use(authenticate);
router.get(
   "/teaching-requests",

   learningCommitmentController.getTeachingRequestsByTutorId
);
// GET  - Lấy danh sách
router.get("/", learningCommitmentController.listLearningCommitments);

// GET - Lấy danh sách learning commitments active của tutor hiện tại
router.get(
   "/tutor/active-commitments",
   learningCommitmentController.getActiveLearningCommitmentsByTutor
);

// POST - Tạo mới
router.post("/", learningCommitmentController.createLearningCommitment);

// POST - Yêu cầu/đồng ý hủy
router.post(
   "/:id/request-cancellation",
   learningCommitmentController.requestCancellation
);

// POST - Từ chối hủy
router.post(
   "/:id/reject-cancellation",
   learningCommitmentController.rejectCancellation
);

// POST - Khởi tạo top-up (thêm buổi)
router.post("/:id/topup", learningCommitmentController.initiateTopUp);

// POST  - Khởi tạo thanh toán
router.post("/:id/payment", learningCommitmentController.initiatePayment);

// GET  - Lấy chi tiết
router.get("/:id", learningCommitmentController.getLearningCommitment);

// POST - Từ chối learning commitment (khi pending_agreement)
router.post(
   "/:id/reject",
   learningCommitmentController.rejectLearningCommitment
);

export default router;
