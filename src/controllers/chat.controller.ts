import { Request, Response, NextFunction } from "express";
import chatService from "../services/chat.service";
import socketService from "../socket/chatSocket";

class ChatController {
   /**
    * POST /api/chat/upload-image
    * Upload ảnh trước khi gửi message
    */
   async uploadImage(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.file) {
            return res.status(400).json({
               success: false,
               message: "No image file provided",
            });
         }

         // Validate file type
         const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/gif",
            "image/webp",
         ];
         if (!allowedMimeTypes.includes(req.file.mimetype)) {
            return res.status(400).json({
               success: false,
               message: "Invalid file type. Only images are allowed",
            });
         }

         // Validate file size (max 5MB)
         const maxSize = 5 * 1024 * 1024;
         if (req.file.size > maxSize) {
            return res.status(400).json({
               success: false,
               message: "File too large. Maximum size is 5MB",
            });
         }

         const imageUrl = await chatService.uploadChatImage(req.file);

         res.status(200).json({
            success: true,
            data: { imageUrl },
         });
      } catch (error) {
         next(error);
      }
   }

   /**
    * POST /api/chat/upload-images
    * Upload nhiều ảnh cùng lúc (max 5 ảnh)
    */
   async uploadImages(req: Request, res: Response, next: NextFunction) {
      try {
         if (
            !req.files ||
            !Array.isArray(req.files) ||
            req.files.length === 0
         ) {
            return res.status(400).json({
               success: false,
               message: "No image files provided",
            });
         }

         // Giới hạn số lượng ảnh
         if (req.files.length > 5) {
            return res.status(400).json({
               success: false,
               message: "Maximum 5 images allowed",
            });
         }

         // Validate từng file
         const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/gif",
            "image/webp",
         ];
         const maxSize = 5 * 1024 * 1024;

         for (const file of req.files) {
            if (!allowedMimeTypes.includes(file.mimetype)) {
               return res.status(400).json({
                  success: false,
                  message: "Invalid file type. Only images are allowed",
               });
            }
            if (file.size > maxSize) {
               return res.status(400).json({
                  success: false,
                  message: "File too large. Maximum size is 5MB per image",
               });
            }
         }

         const imageUrls = await chatService.uploadMultipleChatImages(
            req.files
         );

         res.status(200).json({
            success: true,
            data: { imageUrls },
         });
      } catch (error) {
         next(error);
      }
   }

   /**
    * GET /api/chat/conversations
    * Lấy danh sách conversations
    */
   async getConversations(req: Request, res: Response, next: NextFunction) {
      try {
         const userId = (req as any).userId;
         const page = parseInt(req.query.page as string) || 1;
         const limit = parseInt(req.query.limit as string) || 20;

         const result = await chatService.getUserConversations(
            userId,
            page,
            limit
         );

         res.status(200).json({
            success: true,
            data: result.conversations,
            pagination: result.pagination,
         });
      } catch (error) {
         next(error);
      }
   }

   /**
    * GET /api/chat/conversations/:userId
    * Lấy hoặc tạo conversation với user
    */
   async getOrCreateConversation(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const currentUserId = (req as any).userId;
         const { userId } = req.params;

         // Validate userId format
         if (!userId || userId.length !== 24) {
            return res.status(400).json({
               success: false,
               message: "Invalid user ID format",
            });
         }

         if (!currentUserId) {
            return res.status(401).json({
               success: false,
               message: "Authentication failed - no user ID",
            });
         }

         if (currentUserId === userId) {
            return res.status(400).json({
               success: false,
               message: "Cannot create conversation with yourself",
            });
         }

         const conversation = await chatService.getOrCreateConversation(
            currentUserId,
            userId
         );

         res.status(200).json({
            success: true,
            data: conversation,
         });
      } catch (error) {
         next(error);
      }
   }

   /**
    * GET /api/chat/conversations/:conversationId/messages
    * Lấy messages trong conversation
    */
   async getMessages(req: Request, res: Response, next: NextFunction) {
      try {
         const userId = (req as any).userId;
         const { conversationId } = req.params;
         const page = parseInt(req.query.page as string) || 1;
         const limit = parseInt(req.query.limit as string) || 50;

         const result = await chatService.getMessages(
            conversationId,
            userId,
            page,
            limit
         );

         res.status(200).json({
            success: true,
            data: result.messages,
            pagination: result.pagination,
         });
      } catch (error) {
         next(error);
      }
   }

   /**
    * GET /api/chat/search
    * Tìm kiếm conversations
    */
   async searchConversations(req: Request, res: Response, next: NextFunction) {
      try {
         const userId = (req as any).userId;
         const { keyword } = req.query;

         if (!keyword) {
            return res.status(400).json({
               success: false,
               message: "Keyword is required",
            });
         }

         const conversations = await chatService.searchConversations(
            userId,
            keyword as string
         );

         res.status(200).json({
            success: true,
            data: conversations,
         });
      } catch (error) {
         next(error);
      }
   }

   /**
    * DELETE /api/chat/conversations/:conversationId
    * Xóa conversation
    */
   async deleteConversation(req: Request, res: Response, next: NextFunction) {
      try {
         const userId = (req as any).userId;
         const { conversationId } = req.params;

         await chatService.deleteConversation(conversationId, userId);

         res.status(200).json({
            success: true,
            message: "Conversation deleted",
         });
      } catch (error) {
         next(error);
      }
   }
}

export default new ChatController();
