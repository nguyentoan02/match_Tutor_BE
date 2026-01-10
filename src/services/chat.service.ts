import { Types } from "mongoose";
import conversationModel from "../models/conversation.model";
import messageModel from "../models/message.model";
import User from "../models/user.model";
import { IConversation } from "../types/types/conversation";
import { IMessage } from "../types/types/message";
import { IUser } from "../types/types/user";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../config/r2";
import { v4 as uuidv4 } from "uuid";

class ChatService {
   /**
    * Upload ảnh lên R2
    */
   async uploadChatImage(file: Express.Multer.File): Promise<string> {
      const fileExtension = file.originalname.split(".").pop();
      const fileName = `chat/${uuidv4()}.${fileExtension}`;

      const uploadParams = {
         Bucket: process.env.R2_BUCKET_NAME!,
         Key: fileName,
         Body: file.buffer,
         ContentType: file.mimetype,
      };

      await s3Client.send(new PutObjectCommand(uploadParams));

      const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileName}`;
      return publicUrl;
   }

   /**
    * Upload nhiều ảnh lên R2
    */
   async uploadMultipleChatImages(
      files: Express.Multer.File[]
   ): Promise<string[]> {
      const uploadPromises = files.map((file) => this.uploadChatImage(file));
      return await Promise.all(uploadPromises);
   }

   /**
    * Lấy hoặc tạo conversation giữa 2 users
    */
   async getOrCreateConversation(
      userId1: string,
      userId2: string
   ): Promise<IConversation> {
      // Validate ObjectId format
      if (
         !Types.ObjectId.isValid(userId1) ||
         !Types.ObjectId.isValid(userId2)
      ) {
         throw new Error("Invalid ObjectId format");
      }

      // Convert to ObjectId trước
      const id1 = new Types.ObjectId(userId1);
      const id2 = new Types.ObjectId(userId2);

      // Validate users exist
      const [user1, user2] = await Promise.all([
         User.findById(id1),
         User.findById(id2),
      ]);

      if (!user1 || !user2) {
         throw new Error("One or both users not found");
      }

      if (user1.isBanned || user2.isBanned) {
         throw new Error("Cannot create conversation with banned user");
      }

      // Sort để đảm bảo unique index hoạt động
      const participants = [id1, id2].sort((a, b) =>
         a.toString().localeCompare(b.toString())
      );

      let conversation = await conversationModel
         .findOne({
            participants: {
               $all: participants,
            },
         })
         .populate("participants", "name email avatarUrl role")
         .populate({
            path: "lastMessage",
            populate: {
               path: "senderId",
               select: "name avatarUrl email role",
            },
         });

      if (!conversation) {
         conversation = await conversationModel.create({
            participants: participants,
         });

         await conversation.populate(
            "participants",
            "name email avatarUrl role"
         );
      }

      return conversation;
   }

   /**
    * Lấy danh sách conversations của user
    */
   async getUserConversations(
      userId: string,
      page: number = 1,
      limit: number = 20
   ) {
      const skip = (page - 1) * limit;

      const [conversations, total] = await Promise.all([
         conversationModel
            .find({
               participants: new Types.ObjectId(userId),
               isActive: true,
            })
            .sort({ lastMessageAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("participants", "name email avatarUrl role")
            .populate({
               path: "lastMessage",
               populate: {
                  path: "senderId",
                  select: "name avatarUrl email role",
               },
            })
            .lean(),
         conversationModel.countDocuments({
            participants: new Types.ObjectId(userId),
            isActive: true,
         }),
      ]);

      const formattedConversations = conversations.map((conv: any) => ({
         ...conv,
         otherUser: conv.participants.find(
            (p: any) => p._id.toString() !== userId
         ),
      }));

      return {
         conversations: formattedConversations,
         pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
         },
      };
   }

   /**
    * Lấy messages trong conversation
    */
   async getMessages(
      conversationId: string,
      userId: string,
      page: number = 1,
      limit: number = 50
   ) {
      // Verify user is participant
      const conversation = await conversationModel.findById(conversationId);
      if (!conversation) {
         throw new Error("Conversation not found");
      }

      const isParticipant = conversation.participants.some(
         (id) => id.toString() === userId
      );
      if (!isParticipant) {
         throw new Error("Unauthorized access to conversation");
      }

      const skip = (page - 1) * limit;

      const [messages, total] = await Promise.all([
         messageModel
            .find({ conversationId: new Types.ObjectId(conversationId) })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate("senderId", "name avatarUrl email role")
            .lean(),
         messageModel.countDocuments({
            conversationId: new Types.ObjectId(conversationId),
         }),
      ]);

      const formattedMessages = messages.map((msg: any) => ({
         ...msg,
         sender: msg.senderId,
         senderId: undefined,
      }));

      return {
         messages: formattedMessages.reverse(),
         pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
         },
      };
   }

   /**
    * Tìm kiếm conversations
    */
   async searchConversations(userId: string, keyword: string) {
      const conversations = await conversationModel
         .find({
            participants: new Types.ObjectId(userId),
            isActive: true,
         })
         .populate("participants", "name email avatarUrl role")
         .populate({
            path: "lastMessage",
            populate: {
               path: "senderId",
               select: "name avatarUrl email role",
            },
         })
         .lean();

      // Filter by other user's name or email
      const filtered = conversations.filter((conv: any) => {
         const otherUser = conv.participants.find(
            (p: any) => p._id.toString() !== userId
         );
         if (!otherUser) return false;

         const searchText =
            `${otherUser.name} ${otherUser.email}`.toLowerCase();
         return searchText.includes(keyword.toLowerCase());
      });

      return filtered.map((conv: any) => ({
         ...conv,
         otherUser: conv.participants.find(
            (p: any) => p._id.toString() !== userId
         ),
      }));
   }

   /**
    * Delete/Archive conversation
    */
   async deleteConversation(conversationId: string, userId: string) {
      const conversation = await conversationModel.findById(conversationId);
      if (!conversation) {
         throw new Error("Conversation not found");
      }

      const isParticipant = conversation.participants.some(
         (id) => id.toString() === userId
      );
      if (!isParticipant) {
         throw new Error("Unauthorized access");
      }

      // Soft delete
      conversation.isActive = false;
      await conversation.save();

      return { success: true };
   }

   async markMessagesAsRead(
      conversationId: string,
      userId: string,
      messageIds?: string[]
   ) {
      // ensure conversation and participant check
      const conversation = await conversationModel.findById(conversationId);
      if (!conversation) throw new Error("Conversation not found");
      const isParticipant = conversation.participants.some(
         (id) => id.toString() === userId
      );
      if (!isParticipant) throw new Error("Unauthorized access");

      const filter: any = {
         conversationId: new Types.ObjectId(conversationId),
      };
      if (messageIds && messageIds.length) {
         filter._id = { $in: messageIds.map((id) => new Types.ObjectId(id)) };
      }

      await messageModel.updateMany(filter, {
         $addToSet: { isReadBy: new Types.ObjectId(userId) },
      });

      // return updated messages (populated)
      const updated = await messageModel
         .find(filter)
         .populate("senderId", "name avatarUrl email role")
         .lean();

      return updated.map((m: any) => ({
         ...m,
         sender: m.senderId,
         senderId: undefined,
      }));
   }
}

export default new ChatService();
