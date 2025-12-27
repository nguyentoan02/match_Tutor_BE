import { Namespace, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

import Message from "../models/message.model";
import User from "../models/user.model";
import { IMessage } from "../types/types/message";
import conversationModel from "../models/conversation.model";
import { IConversation } from "../types/types/conversation";
import chatService from "../services/chat.service";

declare module "socket.io" {
   interface Socket {
      userId: string;
      user: any;
   }
}

interface SendMessageData {
   chatId: string;
   content: string;
}

class SocketService {
   private chatNamespace: Namespace | null;
   private connectedUsers: Map<string, string>;

   constructor() {
      this.chatNamespace = null;
      this.connectedUsers = new Map();
   }

   initialize(chatNamespace: Namespace) {
      this.chatNamespace = chatNamespace;

      // Authentication middleware for chat namespace
      this.chatNamespace.use(async (socket: Socket, next) => {
         try {
            const auth = socket.handshake.auth || {};
            const query = socket.handshake.query || {};
            const token =
               auth.token ||
               (query && (query as any).token) ||
               (socket.handshake.headers &&
                  (socket.handshake.headers as any).authorization);

            if (!token) {
               return next(new Error("No token provided"));
            }

            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
               return next(new Error("JWT secret is not configured"));
            }

            const rawToken =
               typeof token === "string" && token.startsWith("Bearer ")
                  ? token.split(" ")[1]
                  : (token as string);

            const decoded = jwt.verify(rawToken, jwtSecret) as { id: string };
            const user = (await User.findById(decoded.id).select(
               "-password"
            )) as any;

            if (!user) return next(new Error("User not found"));
            if (user.isBanned) return next(new Error("User is banned"));

            socket.userId = user._id.toString();
            socket.user = user;
            (socket as any).data = (socket as any).data || {};
            (socket as any).data.user = user;

            next();
         } catch (error) {
            next(new Error("Authentication failed"));
         }
      });

      this.chatNamespace.on("connection", (socket: Socket) => {
         const s = socket as Socket & { userId?: string; user?: any };

         if (s.user && s.userId) {
            // Store connected user for chat
            this.connectedUsers.set(s.userId, s.id);

            // Join user chat rooms
            this.joinUserRooms(s).catch((err) =>
               console.error("joinUserRooms error:", err)
            );

            // Emit chat connection success
            s.emit("chat_connected", {
               message: "Connected to chat service",
               userId: s.userId,
               namespace: "chat",
               timestamp: new Date().toISOString(),
            });
         }

         // Setup chat-specific event handlers
         s.on("joinChat", (chatId: string) => {
            s.join(`chat_${chatId}`);
            s.emit("joinedChat", { chatId });
         });

         s.on("leaveChat", (chatId: string) => {
            s.leave(`chat_${chatId}`);
            s.emit("leftChat", { chatId });
         });

         s.on("sendMessage", async (data: SendMessageData) => {
            await this.handleSendMessage(s, data);
         });

         // Handle typing indicators
         s.on("typing", (data: { chatId: string; isTyping: boolean }) => {
            s.to(`chat_${data.chatId}`).emit("userTyping", {
               userId: s.userId,
               userName: s.user?.name,
               isTyping: data.isTyping,
            });
         });

         // Handle ping/pong for chat service health
         s.on("chatPing", () => {
            s.emit("chatPong", { timestamp: new Date().toISOString() });
         });

         // Client requests mark-as-read
         s.on(
            "markRead",
            async (data: { chatId: string; messageIds?: string[] }) => {
               try {
                  if (!s.userId) {
                     s.emit("message_error", { message: "Unauthenticated" });
                     return;
                  }
                  const updatedMessages = await chatService.markMessagesAsRead(
                     data.chatId,
                     s.userId,
                     data.messageIds
                  );

                  // notify all in the chat room that these messages were read
                  this.chatNamespace
                     ?.to(`chat_${data.chatId}`)
                     .emit("messagesRead", {
                        chatId: data.chatId,
                        userId: s.userId,
                        messageIds:
                           data.messageIds ||
                           updatedMessages.map((m: any) => m._id),
                        messages: updatedMessages,
                        timestamp: new Date().toISOString(),
                     });

                  // ack to sender
                  s.emit("markRead_ack", {
                     chatId: data.chatId,
                     timestamp: new Date().toISOString(),
                  });
               } catch (err) {
                  console.error("markRead error:", err);
                  s.emit("message_error", {
                     message: "Failed to mark messages as read",
                  });
               }
            }
         );

         s.on("disconnect", (reason) => {
            if (s.userId) {
               this.connectedUsers.delete(s.userId);
            }
         });

         s.on("error", (error) => {
            console.error("🚨 Chat socket error:", error);
         });
      });
   }

   async joinUserRooms(socket: Socket & { userId?: string }) {
      try {
         if (!socket.userId) return;
         const chats = await conversationModel
            .find<IConversation>({
               participants: socket.userId,
            })
            .exec();

         chats.forEach((chat) => {
            socket.join(`chat_${String(chat._id)}`);
         });

         // Emit list of joined chats
         socket.emit("joinedRooms", {
            count: chats.length,
            chatIds: chats.map((chat) => String(chat._id)),
         });
      } catch (error) {
         console.error("Error joining user rooms:", error);
      }
   }

   async handleSendMessage(
      socket: Socket & { userId?: string; user?: any },
      data: SendMessageData
   ) {
      try {
         if (!socket.userId) {
            socket.emit("message_error", { message: "Unauthenticated" });
            return;
         }

         const { chatId, content } = data;

         const chat = await conversationModel
            .findById<IConversation>(chatId)
            .exec();
         if (!chat) {
            socket.emit("message_error", { message: "Chat not found" });
            return;
         }

         const isParticipant = chat.participants?.some(
            (id: any) => id.toString() === socket.userId
         );
         if (!isParticipant) {
            socket.emit("message_error", { message: "Access denied" });
            return;
         }

         const message = new Message({
            conversationId: new Types.ObjectId(chatId),
            senderId: new Types.ObjectId(socket.userId),
            content,
            isReadBy: [new Types.ObjectId(socket.userId)],
         } as Partial<IMessage>);
         await message.save();

         await message.populate({
            path: "senderId",
            select: "name avatarUrl email role",
         });

         const messageObj = message.toObject();
         if ((messageObj as any).senderId) {
            (messageObj as any).sender = (messageObj as any).senderId;
            delete (messageObj as any).senderId;
         }

         chat.lastMessage = message._id as Types.ObjectId;
         chat.lastMessageAt = new Date();
         await chat.save();

         // Emit to all users in the chat room
         this.chatNamespace?.to(`chat_${chatId}`).emit("newMessage", {
            message: messageObj,
            chat: chatId,
         });

         // Emit success to sender
         socket.emit("message_sent", {
            messageId: message._id,
            chatId,
            timestamp: new Date().toISOString(),
         });
      } catch (error) {
         console.error("Error sending message:", error);
         socket.emit("message_error", { message: "Failed to send message" });
      }
   }

   // External API for emitting messages (if needed)
   emitNewMessage(chatId: string, message: IMessage) {
      if (this.chatNamespace) {
         this.chatNamespace.to(`chat_${chatId}`).emit("newMessage", {
            message,
            chat: chatId,
         });
      }
   }

   // Check if user is online in chat
   isUserOnline(userId: string): boolean {
      return this.connectedUsers.has(userId);
   }

   // Get connected users count
   getConnectedUsersCount(): number {
      return this.connectedUsers.size;
   }

   // Expose namespace for external use
   getNamespace(): Namespace | null {
      return this.chatNamespace;
   }
}

export default new SocketService();
