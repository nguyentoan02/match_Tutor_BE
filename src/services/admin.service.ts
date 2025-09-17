import User from "../models/user.model";
import { NotFoundError, BadRequestError } from "../utils/error.response";
import { IUser } from "../types/types/user";
import { transporter } from "../config/mail";
import { 
   getBanNotificationEmailTemplate, 
   getUnbanNotificationEmailTemplate 
} from "../template/adminEmail";
import { getVietnamTime } from "../utils/date.util";
import { GetBannedUsersQuery } from "../schemas/admin.schema";

export class AdminService {
   // Ban a user
   async banUser(userId: string, reason: string, adminId: string): Promise<IUser> {
      const user = await User.findById(userId);
      if (!user) {
         throw new NotFoundError("User not found");
      }

      if (user.isBanned) {
         throw new BadRequestError("User is already banned");
      }

      if (user.role === "ADMIN") {
         throw new BadRequestError("Cannot ban admin users");
      }

      // Update user ban status
      user.isBanned = true;
      user.banReason = reason;
      user.bannedAt = getVietnamTime();
      await user.save();

      // Send ban notification email
      try {
         const banDate = user.bannedAt!.toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
         });

         const emailTemplate = getBanNotificationEmailTemplate(
            user.name,
            reason,
            banDate
         );

         await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Account Suspended - MatchTutor",
            html: emailTemplate,
         });
      } catch (emailError) {
         console.error("Failed to send ban notification email:", emailError);
         // Don't throw error, just log it
      }

      const userObj = user.toObject();
      delete (userObj as any).password;
      return userObj as IUser;
   }

   // Unban a user
   async unbanUser(userId: string, adminId: string): Promise<IUser> {
      const user = await User.findById(userId);
      if (!user) {
         throw new NotFoundError("User not found");
      }

      if (!user.isBanned) {
         throw new BadRequestError("User is not banned");
      }

      // Update user ban status
      user.isBanned = false;
      user.banReason = undefined;
      user.bannedAt = undefined;
      await user.save();

      // Send unban notification email
      try {
         const unbanDate = getVietnamTime().toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
         });

         const emailTemplate = getUnbanNotificationEmailTemplate(
            user.name,
            unbanDate
         );

         await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: user.email,
            subject: "Account Restored - MatchTutor",
            html: emailTemplate,
         });
      } catch (emailError) {
         console.error("Failed to send unban notification email:", emailError);
         // Don't throw error, just log it
      }

      const userObj = user.toObject();
      delete (userObj as any).password;
      return userObj as IUser;
   }

   // Get banned users with pagination and search
   async getBannedUsers(query: GetBannedUsersQuery) {
      const { page, limit, search } = query;
      const skip = (page - 1) * limit;

      // Build search filter
      const searchFilter: any = { isBanned: true };
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ bannedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get user ban history
   async getUserBanHistory(userId: string): Promise<IUser | null> {
      const user = await User.findById(userId)
         .select("-password")
         .lean();
      
      if (!user) {
         throw new NotFoundError("User not found");
      }

      return user;
   }

   // Get all users with pagination and search (for admin dashboard)
   async getAllUsers(query: { page: number; limit: number; search?: string; role?: string }) {
      const { page, limit, search, role } = query;
      const skip = (page - 1) * limit;

      // Build search filter
      const searchFilter: any = {};
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }
      if (role) {
         searchFilter.role = role;
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get active users (not banned) with pagination and search
   async getActiveUsers(query: { page: number; limit: number; search?: string; role?: string }) {
      const { page, limit, search, role } = query;
      const skip = (page - 1) * limit;

      // Build search filter for active users
      const searchFilter: any = { isBanned: { $ne: true } };
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }
      if (role) {
         searchFilter.role = role;
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get banned users with pagination and search (separate from getBannedUsers for different use cases)
   async getBannedUsersList(query: { page: number; limit: number; search?: string; role?: string }) {
      const { page, limit, search, role } = query;
      const skip = (page - 1) * limit;

      // Build search filter for banned users
      const searchFilter: any = { isBanned: true };
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }
      if (role) {
         searchFilter.role = role;
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ bannedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get user statistics
   async getUserStatistics() {
      const [
         totalUsers,
         activeUsers,
         bannedUsers,
         usersByRole
      ] = await Promise.all([
         User.countDocuments({}),
         User.countDocuments({ isBanned: { $ne: true } }),
         User.countDocuments({ isBanned: true }),
         User.aggregate([
            {
               $group: {
                  _id: "$role",
                  count: { $sum: 1 },
                  active: {
                     $sum: {
                        $cond: [{ $ne: ["$isBanned", true] }, 1, 0]
                     }
                  },
                  banned: {
                     $sum: {
                        $cond: [{ $eq: ["$isBanned", true] }, 1, 0]
                     }
                  }
               }
            }
         ])
      ]);

      return {
         totalUsers,
         activeUsers,
         bannedUsers,
         usersByRole
      };
   }
}

export default new AdminService();
