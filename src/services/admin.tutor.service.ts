import Tutor from "../models/tutor.model";
import User from "../models/user.model";
import { NotFoundError, BadRequestError } from "../utils/error.response";
import { ITutor } from "../types/types/tutor";
import { transporter } from "../config/mail";
import { 
   getTutorAcceptanceEmailTemplate,
   getTutorRejectionEmailTemplate
} from "../template/adminEmail";
import { getVietnamTime } from "../utils/date.util";

export class AdminTutorService {
   // Accept tutor profile
   async acceptTutor(tutorId: string, adminId: string): Promise<{ tutor: ITutor; approvedAt: Date }> {
      const tutor = await Tutor.findById(tutorId).populate('userId', 'name email isBanned');
      if (!tutor) {
         throw new NotFoundError("Tutor not found");
      }

      if (tutor.isApproved) {
         throw new BadRequestError("Tutor profile is already approved");
      }

      // Check if user is banned
      const user = tutor.userId as any;
      if (user && user.isBanned) {
         throw new BadRequestError("Cannot approve tutor profile for banned user");
      }

      // Update tutor approval status
      tutor.isApproved = true;
      tutor.approvedAt = getVietnamTime();
      tutor.rejectedReason = undefined; // Xóa lý do từ chối cũ (nếu có)
      tutor.rejectedAt = undefined;
      await tutor.save();
      const approvedAt = tutor.approvedAt;

      // Send acceptance notification email
      try {
         const approvalDate = approvedAt.toLocaleString("vi-VN", {
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

      return {
         tutor: tutor.toObject() as ITutor,
         approvedAt
      };
   }

   // Reject tutor profile
   async rejectTutor(tutorId: string, reason: string, adminId: string): Promise<{ tutor: ITutor; reason: string; rejectedAt: Date }> {
      const tutor = await Tutor.findById(tutorId).populate('userId', 'name email');
      if (!tutor) {
         throw new NotFoundError("Tutor not found");
      }

      // Set isApproved to false (allow rejecting even approved tutors)
      tutor.isApproved = false;
      tutor.rejectedReason = reason;
      tutor.rejectedAt = getVietnamTime();
      tutor.approvedAt = undefined; // Xóa thời gian duyệt cũ (nếu có)
      await tutor.save();

      // Send rejection notification email
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

      return {
         tutor: tutor.toObject() as ITutor,
         reason,
         rejectedAt: tutor.rejectedAt!
      };
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

export default new AdminTutorService();

