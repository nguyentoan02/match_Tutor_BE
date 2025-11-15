import { Request, Response, NextFunction } from "express";
import chatService from "../services/chat.service";
import socketService from "../socket/chatSocket";

class ChatController {
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
    * POST /api/chat/conversations/:conversationId/messages
    * Gửi message
    */
   // async sendMessage(req: Request, res: Response, next: NextFunction) {
   //    try {
   //       const userId = (req as any).userId;
   //       const { conversationId } = req.params;
   //       const { content } = req.body;

   //       if (!content) {
   //          return res.status(400).json({
   //             success: false,
   //             message: "Content is required",
   //          });
   //       }

   //       const message = await chatService.sendMessage(
   //          conversationId,
   //          userId,
   //          content
   //       );

   //       // Emit socket event - Safe optional call
   //       try {
   //          socketService?.emitNewMessage(conversationId, message);
   //       } catch (socketError) {
   //          console.warn(
   //             "Socket emit failed, but REST response sent:",
   //             socketError
   //          );
   //       }

   //       res.status(201).json({
   //          success: true,
   //          data: message,
   //       });
   //    } catch (error) {
   //       next(error);
   //    }
   // }

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
