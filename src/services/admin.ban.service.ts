import User from "../models/user.model";
import Tutor from "../models/tutor.model";
import { NotFoundError, BadRequestError } from "../utils/error.response";
import { IUser } from "../types/types/user";
import { transporter } from "../config/mail";
import { 
   getBanNotificationEmailTemplate, 
   getUnbanNotificationEmailTemplate
} from "../template/adminEmail";
import { getVietnamTime } from "../utils/date.util";
import { GetBannedUsersQuery } from "../schemas/admin.schema";

export class AdminBanService {
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

      // If user has a tutor profile, set isApproved to false
      const tutorProfile = await Tutor.findOne({ userId: user._id });
      if (tutorProfile) {
         tutorProfile.isApproved = false;
         await tutorProfile.save();
      }

      // Send ban notification email (async, không chờ)
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

      // Gửi email bất đồng bộ (không block response)
      transporter.sendMail({
         from: process.env.EMAIL_USER,
         to: user.email,
         subject: "Account Suspended - MatchTutor",
         html: emailTemplate,
      }).catch(emailError => {
         console.error("Failed to send ban notification email:", emailError);
      });

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

      // Send unban notification email (async, không chờ)
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

      // Gửi email bất đồng bộ (không block response)
      transporter.sendMail({
         from: process.env.EMAIL_USER,
         to: user.email,
         subject: "Account Restored - MatchTutor",
         html: emailTemplate,
      }).catch(emailError => {
         console.error("Failed to send unban notification email:", emailError);
      });

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
}

export default new AdminBanService();

