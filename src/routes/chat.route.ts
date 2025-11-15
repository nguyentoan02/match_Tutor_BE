import { Router } from "express";
import chatController from "../controllers/chat.controller";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

router.use(authenticate);

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

// POST /api/chat/conversations/:conversationId/messages - Gửi message
// router.post(
//    "/conversations/:conversationId/messages",
//    chatController.sendMessage
// );

// DELETE /api/chat/conversations/:conversationId - Xóa conversation
router.delete(
   "/conversations/:conversationId",
   chatController.deleteConversation
);

export default router;
