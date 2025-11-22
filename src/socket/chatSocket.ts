import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";

import Message from "../models/message.model";
import User from "../models/user.model";
import { Server as HttpServer } from "http";
import { IMessage } from "../types/types/message";
import conversationModel from "../models/conversation.model";
import { IConversation } from "../types/types/conversation";

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
   private io: Server | null;
   private connectedUsers: Map<string, string>;

   constructor() {
      this.io = null;
      this.connectedUsers = new Map();
   }

   initialize(server: HttpServer) {
      this.io = new Server(server, {
         cors: {
            origin: process.env.FRONTEND_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true,
         },
      });


      this.io.use(async (socket: Socket, next) => {
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
            console.error("Socket authentication error:", error);
            next(new Error("Authentication failed"));
         }
      });

      this.io.on("connection", (socket: Socket) => {
         const s = socket as Socket & { userId?: string; user?: any };

         if (s.user) {
            if (s.userId) this.connectedUsers.set(s.userId, s.id);
            this.joinUserRooms(s).catch((err) =>
               console.error("joinUserRooms error:", err)
            );
         }

         s.on("joinChat", (chatId: string) => {
            s.join(`chat_${chatId}`);
         });

         s.on("leaveChat", (chatId: string) => {
            s.leave(`chat_${chatId}`);
         });

         s.on("sendMessage", async (data: SendMessageData) => {
            await this.handleSendMessage(s, data);
         });

         s.on("disconnect", () => {
            if (s.user) {
               if (s.userId) this.connectedUsers.delete(s.userId);
            }
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

         this.io?.to(`chat_${chatId}`).emit("newMessage", {
            message: messageObj,
            chat: chatId,
         });
      } catch (error) {
         console.error("Error sending message:", error);
         socket.emit("message_error", { message: "Failed to send message" });
      }
   }

   // Hàm này không còn cần thiết nếu không dùng REST API để gửi tin nhắn nữa
   // nhưng có thể giữ lại để dùng cho các mục đích khác (vd: thông báo hệ thống)
   emitNewMessage(chatId: string, message: IMessage) {
      if (this.io) {
         this.io.to(`chat_${chatId}`).emit("newMessage", {
            message,
            chat: chatId,
         });
      }
   }
}

export default new SocketService();
