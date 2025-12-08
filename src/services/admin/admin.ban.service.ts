import User from "../../models/user.model";
import Tutor from "../../models/tutor.model";
import LearningCommitment from "../../models/learningCommitment.model";
import Session from "../../models/session.model";
import TeachingRequest from "../../models/teachingRequest.model";
import Student from "../../models/student.model";
import Review from "../../models/review.model";
import FavoriteTutor from "../../models/favoriteTutor.model";
import AIRecommendation from "../../models/aiRecommendation.model";
import Conversation from "../../models/conversation.model";
import { NotFoundError, BadRequestError } from "../../utils/error.response";
import { IUser } from "../../types/types/user";
import { 
   getBanNotificationEmailTemplate, 
   getUnbanNotificationEmailTemplate,
   getTutorBannedEmailTemplateForStudent
} from "../../template/adminEmail";
import { addEmailJob } from "../../queues/email.queue";
import { getVietnamTime } from "../../utils/date.util";
import { GetBannedUsersQuery } from "../../schemas/admin.schema";
import { Types } from "mongoose";
import { SessionStatus } from "../../types/enums/session.enum";
import { TeachingRequestStatus } from "../../types/enums/teachingRequest.enum";

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

      // Get userObjectId as ObjectId for use throughout
      const userObjectId: Types.ObjectId = user._id instanceof Types.ObjectId 
         ? user._id 
         : new Types.ObjectId(String(user._id));

      // If user has a tutor profile, process all related data (chỉ hủy sessions, giữ nguyên quyền lợi)
      const tutorProfile = await Tutor.findOne({ userId: userObjectId });
      if (tutorProfile) {
         // 0. Tìm tất cả học sinh có learning commitments với tutor này TRƯỚC KHI xử lý
         // (để gửi email sau, bao gồm cả học sinh có commitments ở mọi status)
         const allStudentCommitmentsForEmail = await LearningCommitment.find({
            tutor: tutorProfile._id
         }).populate({
            path: "student",
            populate: {
               path: "userId",
               select: "name email"
            }
         });

         // Lấy danh sách học sinh duy nhất (tránh gửi email trùng)
         const studentUserIds = new Set<string>();
         const studentInfoMap = new Map<string, { name: string; email: string }>();

         for (const commitment of allStudentCommitmentsForEmail) {
            const student = commitment.student as any;
            const studentUser = student?.userId;
            if (studentUser && studentUser._id) {
               const studentUserId = studentUser._id.toString();
               if (!studentUserIds.has(studentUserId)) {
                  studentUserIds.add(studentUserId);
                  studentInfoMap.set(studentUserId, {
                     name: studentUser.name || "Học sinh",
                     email: studentUser.email
                  });
               }
            }
         }

         // 1. KHÔNG hủy learning commitments (để tutor giữ quyền lợi)
         // Learning commitments sẽ vẫn giữ nguyên status

         // 2. KHÔNG reject teaching requests (để tutor giữ quyền lợi)
         // Teaching requests sẽ vẫn giữ nguyên status

         // 3. Chỉ hủy sessions sắp tới (để không ảnh hưởng đến học sinh)
         // Tìm tất cả learning commitments của tutor này
         const allCommitments = await LearningCommitment.find({
            tutor: tutorProfile._id
         }).select("_id");

         const commitmentIds = allCommitments.map(c => c._id);

         // Tìm sessions chưa học (chưa completed, chưa not_conducted, chưa cancelled, chưa rejected)
         const upcomingSessions = await Session.find({
            learningCommitmentId: { $in: commitmentIds },
            status: { $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED] },
            startTime: { $gt: getVietnamTime() }, // Chưa diễn ra
            isDeleted: { $ne: true } // Chưa bị xóa
         });

         const now = getVietnamTime();
         for (const session of upcomingSessions) {
            // Nếu session ở status CONFIRMED (student đã ACCEPT) -> CANCELLED
            if (session.status === SessionStatus.CONFIRMED && session.studentConfirmation?.status === "ACCEPTED") {
               session.status = SessionStatus.CANCELLED;
               session.cancellation = {
                  cancelledBy: userObjectId,
                  reason: "Gia sư bị admin tạm khóa tài khoản",
                  cancelledAt: now
               };
            }
            // Nếu session ở status SCHEDULED (student chưa confirm hoặc PENDING) -> REJECTED
            else if (session.status === SessionStatus.SCHEDULED) {
               session.status = SessionStatus.REJECTED;
               session.isDeleted = true;
               session.deletedAt = now;
               session.deletedBy = userObjectId;
               // Cập nhật studentConfirmation nếu chưa có hoặc đang PENDING
               if (!session.studentConfirmation || session.studentConfirmation.status === "PENDING") {
                  session.studentConfirmation = {
                     status: "REJECTED",
                     confirmedAt: now
                  };
               }
            }
            await session.save();
         }

         // 4. Ẩn tutor profile (set isApproved = false, xóa embedding để không hiển thị trong search)
         // KHÔNG xóa các thông tin khác để tutor giữ quyền lợi
         tutorProfile.isApproved = false;
         tutorProfile.embedding = [];
         await tutorProfile.save();

         // 5. KHÔNG ẩn reviews (để tutor giữ quyền lợi và đánh giá)
         // Reviews vẫn hiển thị bình thường

         // 6. Không xóa favorite tutors (vì là tạm khóa, khi unban sẽ tự động hiển thị lại)
         // Favorite tutors sẽ tự động ẩn vì tutor profile đã bị ẩn (isApproved = false)

         // 7. Không loại bỏ khỏi AI recommendations (vì khi search sẽ filter theo isApproved)
         // AI recommendations sẽ tự động không hiển thị tutor này vì isApproved = false

         // 8. Không vô hiệu hóa conversations (vì là tạm khóa, user vẫn có thể xem lịch sử chat)
         // Conversations sẽ tự động không hoạt động vì tutor profile đã bị ẩn

         // 11. Gửi email cho tất cả học sinh đã từng có learning commitments với tutor này
         const banDate = user.bannedAt!.toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
         });

         for (const [studentUserId, studentInfo] of studentInfoMap.entries()) {
            if (studentInfo.email) {
               const emailTemplate = getTutorBannedEmailTemplateForStudent(
                  studentInfo.name,
                  user.name,
                  banDate,
                  reason
               );

               // Sử dụng queue để gửi email nhanh chóng (không block request)
               await addEmailJob({
                  from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
                  to: studentInfo.email,
                  subject: "Thông báo về gia sư bị tạm khóa - MatchTutor",
                  html: emailTemplate,
               });
            }
         }
      }

      // Send ban notification email to the banned user (async, không chờ)
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

      // Sử dụng queue để gửi email nhanh chóng (không block response)
      await addEmailJob({
         from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
         to: user.email,
         subject: "Tài khoản bị tạm khóa - MatchTutor",
         html: emailTemplate,
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

      // Get userObjectId as ObjectId for use throughout
      const userObjectId: Types.ObjectId = user._id instanceof Types.ObjectId 
         ? user._id 
         : new Types.ObjectId(String(user._id));

      // If user has a tutor profile, không cần khôi phục gì vì:
      // - Learning commitments vẫn giữ nguyên (chưa bị hủy)
      // - Teaching requests vẫn giữ nguyên (chưa bị reject)
      // - Reviews vẫn hiển thị (chưa bị ẩn)
      // - Chỉ cần admin duyệt lại tutor profile (isApproved = true) nếu muốn
      // Tutor profile sẽ tự động hiển thị lại khi isApproved = true

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

      // Sử dụng queue để gửi email nhanh chóng (không block response)
      await addEmailJob({
         from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
         to: user.email,
         subject: "Tài khoản đã được khôi phục - MatchTutor",
         html: emailTemplate,
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

