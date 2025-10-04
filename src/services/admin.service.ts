import User from "../models/user.model";
import Tutor from "../models/tutor.model";
import { NotFoundError, BadRequestError } from "../utils/error.response";
import { IUser } from "../types/types/user";
import { ITutor } from "../types/types/tutor";
import { transporter } from "../config/mail";
import { 
   getBanNotificationEmailTemplate, 
   getUnbanNotificationEmailTemplate,
   getTutorAcceptanceEmailTemplate,
   getTutorRejectionEmailTemplate
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

    // Get banned tutors with pagination and search
    async getBannedTutors(query: { page: number; limit: number; search?: string }) {
       const { page, limit, search } = query;
       const skip = (page - 1) * limit;

       // Build search filter for banned tutors
       const searchFilter: any = { role: "TUTOR", isBanned: true };
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

    // Get active tutors with pagination and search
    async getActiveTutors(query: { page: number; limit: number; search?: string }) {
       const { page, limit, search } = query;
       const skip = (page - 1) * limit;

       // Build search filter for active tutors
       const searchFilter: any = { role: "TUTOR", isBanned: { $ne: true } };
       if (search) {
          searchFilter.$or = [
             { name: { $regex: search, $options: "i" } },
             { email: { $regex: search, $options: "i" } },
          ];
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

    // Get banned students with pagination and search
    async getBannedStudents(query: { page: number; limit: number; search?: string }) {
       const { page, limit, search } = query;
       const skip = (page - 1) * limit;

       // Build search filter for banned students
       const searchFilter: any = { role: "STUDENT", isBanned: true };
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

    // Get active students with pagination and search
    async getActiveStudents(query: { page: number; limit: number; search?: string }) {
       const { page, limit, search } = query;
       const skip = (page - 1) * limit;

       // Build search filter for active students
       const searchFilter: any = { role: "STUDENT", isBanned: { $ne: true } };
       if (search) {
          searchFilter.$or = [
             { name: { $regex: search, $options: "i" } },
             { email: { $regex: search, $options: "i" } },
          ];
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

     // Accept tutor profile
     async acceptTutor(tutorId: string, adminId: string): Promise<ITutor> {
        const tutor = await Tutor.findById(tutorId).populate('userId', 'name email');
        if (!tutor) {
           throw new NotFoundError("Tutor not found");
        }

        if (tutor.isApproved) {
           throw new BadRequestError("Tutor profile is already approved");
        }

        // Update tutor approval status
        tutor.isApproved = true;
        await tutor.save();

        // Send acceptance notification email
        try {
           const user = tutor.userId as any;
           const approvalDate = getVietnamTime().toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
           });

           const emailTemplate = getTutorAcceptanceEmailTemplate(
              user.name,
              approvalDate
           );

           await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: user.email,
              subject: "Tutor Profile Approved - MatchTutor",
              html: emailTemplate,
           });
        } catch (emailError) {
           console.error("Failed to send tutor acceptance email:", emailError);
           // Don't throw error, just log it
        }

        return tutor.toObject() as ITutor;
     }

     // Reject tutor profile
     async rejectTutor(tutorId: string, reason: string, adminId: string): Promise<ITutor> {
        const tutor = await Tutor.findById(tutorId).populate('userId', 'name email');
        if (!tutor) {
           throw new NotFoundError("Tutor not found");
        }

        if (tutor.isApproved) {
           throw new BadRequestError("Tutor profile is already approved");
        }

        // Send rejection notification email before deleting
        try {
           const user = tutor.userId as any;
           const rejectionDate = getVietnamTime().toLocaleString("vi-VN", {
              timeZone: "Asia/Ho_Chi_Minh",
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
           });

           const emailTemplate = getTutorRejectionEmailTemplate(
              user.name,
              reason,
              rejectionDate
           );

           await transporter.sendMail({
              from: process.env.EMAIL_USER,
              to: user.email,
              subject: "Tutor Profile Rejected - MatchTutor",
              html: emailTemplate,
           });
        } catch (emailError) {
           console.error("Failed to send tutor rejection email:", emailError);
           // Don't throw error, just log it
        }

        return tutor.toObject() as ITutor;
     }

     // Get pending tutors (not approved yet)
     async getPendingTutors(query: { page: number; limit: number; search?: string }) {
        const { page, limit, search } = query;
        const skip = (page - 1) * limit;

        // Build search filter for pending tutors
        const searchFilter: any = { isApproved: false };
        if (search) {
           searchFilter.$or = [
              { bio: { $regex: search, $options: "i" } },
              { subjects: { $in: [new RegExp(search, "i")] } },
              { levels: { $in: [new RegExp(search, "i")] } },
           ];
        }

        const [tutors, total] = await Promise.all([
           Tutor.find(searchFilter)
              .populate('userId', 'name email role')
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(limit)
              .lean(),
           Tutor.countDocuments(searchFilter),
        ]);

        return {
           tutors,
           pagination: {
              page,
              limit,
              total,
              pages: Math.ceil(total / limit),
           },
        };
     }

     // Get tutor profile by ID (for admin)
     async getTutorProfile(tutorId: string): Promise<{ tutor: ITutor | null; hasProfile: boolean; message: string }> {
        const tutor = await Tutor.findById(tutorId)
           .populate('userId', 'name email avatarUrl phone gender address role isBanned bannedAt banReason')
           .lean();

        if (!tutor) {
           return {
              tutor: null,
              hasProfile: false,
              message: "Tutor profile not found"
           };
        }

        return {
           tutor: tutor as ITutor,
           hasProfile: true,
           message: "Tutor profile retrieved successfully"
        };
     }


     // Get tutors with userId and tutorId mapping (for frontend)
     async getTutorsWithMapping(query: { page: number; limit: number; search?: string; status?: 'all' | 'pending' | 'approved' | 'banned' }) {
        const { page, limit, search, status = 'all' } = query;
        const skip = (page - 1) * limit;

        // Build search filter
        let searchFilter: any = { role: "TUTOR" };
        
        // Status filter
        if (status === 'pending') {
           searchFilter.isBanned = { $ne: true };
        } else if (status === 'approved') {
           searchFilter.isBanned = { $ne: true };
        } else if (status === 'banned') {
           searchFilter.isBanned = true;
        }

        if (search) {
           searchFilter.$or = [
              { name: { $regex: search, $options: "i" } },
              { email: { $regex: search, $options: "i" } },
           ];
        }

        // Get users first
        const [users, totalUsers] = await Promise.all([
           User.find(searchFilter)
              .select('_id name email avatarUrl phone gender address role isBanned bannedAt banReason createdAt')
              .sort({ createdAt: -1 })
              .skip(skip)
              .limit(limit)
              .lean(),
           User.countDocuments(searchFilter),
        ]);

        // Get tutor profiles for these users
        const userIds = users.map(user => user._id);
        const tutors = await Tutor.find({ userId: { $in: userIds } })
           .select('_id userId isApproved bio subjects levels hourlyRate createdAt updatedAt')
           .lean();

        // Create mapping
        const tutorMap = new Map();
        tutors.forEach(tutor => {
           tutorMap.set(tutor.userId.toString(), tutor);
        });

        // Combine user and tutor data
        const tutorsWithMapping = users.map(user => {
           const tutor = tutorMap.get(user._id.toString());
           return {
              userId: user._id,
              tutorId: tutor?._id || null,
              hasProfile: !!tutor,
              user: {
                 name: user.name,
                 email: user.email,
                 avatarUrl: user.avatarUrl,
                 phone: user.phone,
                 gender: user.gender,
                 address: user.address,
                 role: user.role,
                 isBanned: user.isBanned,
                 bannedAt: user.bannedAt,
                 banReason: user.banReason,
                 createdAt: user.createdAt
              },
              tutor: tutor ? {
                 _id: tutor._id,
                 isApproved: tutor.isApproved,
                 bio: tutor.bio,
                 subjects: tutor.subjects,
                 levels: tutor.levels,
                 hourlyRate: tutor.hourlyRate,
                 createdAt: tutor.createdAt,
                 updatedAt: tutor.updatedAt
              } : null
           };
        });

        return {
           tutors: tutorsWithMapping,
           pagination: {
              page,
              limit,
              total: totalUsers,
              pages: Math.ceil(totalUsers / limit),
           },
        };
     }
}

export default new AdminService();
