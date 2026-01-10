import { Router } from "express";
import chatController from "../controllers/chat.controller";
import { authenticate } from "../middlewares/auth.middleware";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

// POST /api/chat/upload-image - Upload ảnh chat
router.post(
   "/upload-image",
   upload.single("image"),
   chatController.uploadImage
);

// Upload nhiều ảnh (mới)
router.post(
   "/upload-images",
   upload.array("images", 5), // Max 5 ảnh
   chatController.uploadImages
);

// GET /api/chat/conversations - Lấy danh sách conversations
router.get("/conversations", chatController.getConversations);

// GET /api/chat/search - Tìm kiếm conversations
router.get("/search", chatController.searchConversations);

// GET /api/chat/conversations/:userId - Lấy hoặc tạo conversation với user
router.get("/conversations/:userId", chatController.getOrCreateConversation);

// GET /api/chat/conversations/:conversationId/messages - Lấy messages
router.get(
   "/conversations/:conversationId/messages",
   chatController.getMessages
);

// DELETE /api/chat/conversations/:conversationId - Xóa conversation
router.delete(
   "/conversations/:conversationId",
   chatController.deleteConversation
);

export default router;
