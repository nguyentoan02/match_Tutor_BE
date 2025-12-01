import Tutor from "../../models/tutor.model";
import User from "../../models/user.model";
import LearningCommitment from "../../models/learningCommitment.model";
import Session from "../../models/session.model";
import TeachingRequest from "../../models/teachingRequest.model";
import ViolationReport from "../../models/violationReport.model";
import { NotFoundError, BadRequestError } from "../../utils/error.response";
import { ITutor } from "../../types/types/tutor";
import { 
   getTutorAcceptanceEmailTemplate,
   getTutorRejectionEmailTemplate,
   getReportResolvedEmailTemplateForStudent,
   getReportResolvedEmailTemplateForTutor
} from "../../template/adminEmail";
import { addEmailJob } from "../../queues/email.queue";
import { getVietnamTime } from "../../utils/date.util";
import { addEmbeddingJob } from "../../queues/embedding.queue";
import { SessionStatus } from "../../types/enums/session.enum";
import { TeachingRequestStatus } from "../../types/enums/teachingRequest.enum";
import { ViolationStatusEnum } from "../../types/enums/violationReport.enum";
import { Types } from "mongoose";

export class AdminTutorService {
   // Accept tutor profile (cho phép accept lại ngay cả khi đã bị report)
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
      
      // add create embeding job
      await addEmbeddingJob(user.toString());     

      // Update tutor approval status (cho phép approve lại ngay cả khi đã bị report)
      tutor.isApproved = true;
      tutor.approvedAt = getVietnamTime();
      tutor.rejectedReason = undefined; // Xóa lý do từ chối cũ (nếu có)
      tutor.rejectedAt = undefined;
      // Giữ lại hasBeenReported và reportedAt để lưu lịch sử, không xóa
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

         // Sử dụng queue để gửi email nhanh chóng (không block request)
         await addEmailJob({
            from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Hồ sơ gia sư đã được duyệt - MatchTutor",
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
      
      // bỏ embed đi khi mà đã bị reject profile
      tutor.embedding = []
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

         // Sử dụng queue để gửi email nhanh chóng (không block request)
         await addEmailJob({
            from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
            to: user.email,
            subject: "Hồ sơ gia sư bị từ chối - MatchTutor",
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
   // Loại trừ: tutor có user bị banned, tutor đã bị report và xử lý, tutor đã bị reject
   async getPendingTutors(query: { page: number; limit: number; search?: string }) {
      const { page, limit, search } = query;
      const skip = (page - 1) * limit;

      // Build search filter for pending tutors
      // Chỉ lấy tutor chưa approved, chưa bị reject, chưa bị report
      const searchFilter: any = { 
         isApproved: false,
         rejectedAt: { $exists: false }, // Chưa bị reject
         hasBeenReported: { $ne: true }, // Chưa bị report và xử lý
      };
      
      if (search) {
         searchFilter.$or = [
            { bio: { $regex: search, $options: "i" } },
            { subjects: { $in: [new RegExp(search, "i")] } },
            { levels: { $in: [new RegExp(search, "i")] } },
         ];
      }

      // Lấy tất cả tutors matching filter
      const allTutors = await Tutor.find(searchFilter)
         .populate('userId', 'name email role isBanned')
         .sort({ createdAt: -1 })
         .lean();

      // Filter out tutors có user bị banned
      const validTutors = allTutors.filter((tutor: any) => {
         const user = tutor.userId;
         return user && !user.isBanned;
      });

      // Pagination cho filtered results
      const tutors = validTutors.slice(skip, skip + limit);
      const total = validTutors.length;

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
         // Approved: không bị ban, không bị report
         searchFilter.isBanned = { $ne: true };
      } else if (status === 'banned') {
         searchFilter.isBanned = true;
      } else if (status === 'all') {
         // All: mặc định loại trừ banned và reported tutors
         searchFilter.isBanned = { $ne: true };
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
         .select('_id userId isApproved bio subjects levels hourlyRate hasBeenReported reportedAt reportCount createdAt updatedAt')
         .lean();

      // Create mapping
      const tutorMap = new Map();
      tutors.forEach(tutor => {
         tutorMap.set(tutor.userId.toString(), tutor);
      });

      // Combine user and tutor data
      let tutorsWithMapping = users.map(user => {
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
               hasBeenReported: tutor.hasBeenReported || false,
               reportedAt: tutor.reportedAt || null,
               reportCount: tutor.reportCount || 0,
               createdAt: tutor.createdAt,
               updatedAt: tutor.updatedAt
            } : null
         };
      });

      // Filter out tutors bị ban hoặc bị report (trừ khi status là 'banned')
      if (status !== 'banned') {
         tutorsWithMapping = tutorsWithMapping.filter(item => {
            // Loại trừ user bị banned
            if (item.user.isBanned) {
               return false;
            }
            // Loại trừ tutor đã bị report và xử lý
            if (item.tutor && item.tutor.hasBeenReported) {
               return false;
            }
            return true;
         });
      }

      // Recalculate total after filtering
      const filteredTotal = tutorsWithMapping.length;

      return {
         tutors: tutorsWithMapping,
         pagination: {
            page,
            limit,
            total: filteredTotal,
            pages: Math.ceil(filteredTotal / limit),
         },
      };
   }

   // Hide tutor (ban tutor profile due to report)
   async hideTutor(tutorId: string, adminId: string): Promise<{ tutor: ITutor; message: string }> {
      const tutor = await Tutor.findById(tutorId).populate('userId', 'name email');
      if (!tutor) {
         throw new NotFoundError("Tutor not found");
      }

      if (!tutor.isApproved) {
         throw new BadRequestError("Tutor is already hidden (not approved)");
      }

      const tutorUserId = (tutor.userId as any)?._id || tutor.userId;
      if (!tutorUserId) {
         throw new NotFoundError("Tutor user not found");
      }

      // 1. Xử lý learning commitments đang active -> cancelled
      const activeCommitments = await LearningCommitment.find({
         tutor: tutor._id,
         status: "active"
      });

      for (const commitment of activeCommitments) {
         commitment.status = "cancelled";
         commitment.cancellationReason = "Gia sư bị report";
         // Set cancellation decision với tutor là người hủy
         if (!commitment.cancellationDecision) {
            commitment.cancellationDecision = {
               student: { status: "PENDING" as any },
               tutor: { status: "ACCEPTED" as any },
               requestedBy: "tutor",
               requestedAt: getVietnamTime(),
               reason: "Gia sư bị report"
            };
         } else {
            commitment.cancellationDecision.requestedBy = "tutor";
            commitment.cancellationDecision.tutor.status = "ACCEPTED" as any;
            commitment.cancellationDecision.tutor.reason = "Gia sư bị report";
            commitment.cancellationDecision.requestedAt = getVietnamTime();
            commitment.cancellationDecision.reason = "Gia sư bị report";
         }
         await commitment.save();
      }

      // 2. Xử lý learning commitments pending_agreement -> rejected
      await LearningCommitment.updateMany(
         {
            tutor: tutor._id,
            status: "pending_agreement"
         },
         {
            status: "rejected"
         }
      );

      // 3. Xử lý learning commitments cancellation_pending -> cancelled
      const cancellationPendingCommitments = await LearningCommitment.find({
         tutor: tutor._id,
         status: "cancellation_pending"
      });

      for (const commitment of cancellationPendingCommitments) {
         commitment.status = "cancelled";
         commitment.cancellationReason = "Gia sư bị report";
         if (commitment.cancellationDecision) {
            commitment.cancellationDecision.requestedBy = "tutor";
            commitment.cancellationDecision.tutor.status = "ACCEPTED" as any;
            commitment.cancellationDecision.tutor.reason = "Gia sư bị report";
            commitment.cancellationDecision.reason = "Gia sư bị report";
         }
         await commitment.save();
      }

      // 4. Xử lý sessions chưa học
      const tutorUserForSessions = await User.findById(tutorUserId);
      if (!tutorUserForSessions) {
         throw new NotFoundError("Tutor user not found");
      }

      // Tìm tất cả learning commitments của tutor này
      const allCommitments = await LearningCommitment.find({
         tutor: tutor._id
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
               cancelledBy: new Types.ObjectId(tutorUserId),
               reason: "Gia sư bị admin ẩn profile",
               cancelledAt: now
            };
         }
         // Nếu session ở status SCHEDULED (student chưa confirm hoặc PENDING) -> REJECTED
         // Theo logic session.service.ts confirmParticipation khi student REJECT
         else if (session.status === SessionStatus.SCHEDULED) {
            session.status = SessionStatus.REJECTED;
            session.isDeleted = true;
            session.deletedAt = now;
            session.deletedBy = new Types.ObjectId(tutorUserId);
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

    // 5. Đánh dấu mọi teaching request chưa bị từ chối thành REJECTED
    await TeachingRequest.updateMany(
      {
        tutorId: tutor._id,
        status: { $in: [TeachingRequestStatus.PENDING, TeachingRequestStatus.ACCEPTED] },
      },
      {
        status: TeachingRequestStatus.REJECTED,
      }
    );

    // 6. Tự động cập nhật tất cả reports PENDING của tutor này thành RESOLVED
    // (Khi nhiều student report cùng 1 tutor, tất cả reports sẽ được xử lý cùng lúc)
    const pendingReports = await ViolationReport.find({
      reportedUserId: new Types.ObjectId(tutorUserId),
      status: ViolationStatusEnum.PENDING
    }).populate("reporterId", "name email");

    await ViolationReport.updateMany(
      {
        reportedUserId: new Types.ObjectId(tutorUserId),
        status: ViolationStatusEnum.PENDING
      },
      {
        status: ViolationStatusEnum.RESOLVED
      }
    );

    // 7. Ẩn tutor (set isApproved = false, xóa embedding, lưu lịch sử report)
    // Đếm tổng số reports (PENDING + RESOLVED) để cập nhật reportCount chính xác
    const totalReports = await ViolationReport.countDocuments({
      reportedUserId: new Types.ObjectId(tutorUserId),
      status: { $in: [ViolationStatusEnum.PENDING, ViolationStatusEnum.RESOLVED] }
    });

    tutor.isApproved = false;
    tutor.embedding = [];
    tutor.hasBeenReported = true; // Đánh dấu đã bị report
    tutor.reportedAt = getVietnamTime(); // Lưu thời điểm bị report
    tutor.reportCount = totalReports; // Cập nhật số lượng reports thực tế
    await tutor.save();

    // 8. Gửi email thông báo cho tất cả students đã report tutor này
    const resolvedAt = getVietnamTime().toLocaleString("vi-VN", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const tutorUserForEmail = await User.findById(tutorUserId).select("name email");
    const tutorName = tutorUserForEmail?.name || "Gia sư";
    const action = "Hồ sơ gia sư đã bị ẩn và các cam kết học tập liên quan đã được xử lý.";

    // Gửi email cho từng student đã report
    for (const report of pendingReports) {
      const reporter = report.reporterId as any;
      if (reporter && reporter.email) {
        const emailTemplate = getReportResolvedEmailTemplateForStudent(
          reporter.name || "Học sinh",
          tutorName,
          report.reason || "Không có lý do cụ thể",
          resolvedAt,
          action
        );

        // Sử dụng queue để gửi email nhanh chóng (không block request)
        await addEmailJob({
          from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
          to: reporter.email,
          subject: "Báo cáo vi phạm đã được xử lý - MatchTutor",
          html: emailTemplate,
        });
      }
    }

    // Gửi email cho tutor
    if (tutorUserForEmail && tutorUserForEmail.email) {
      const tutorAction = "Hồ sơ của bạn đã bị ẩn do vi phạm quy tắc cộng đồng. Các cam kết học tập và buổi học liên quan đã được hủy.";
      const emailTemplate = getReportResolvedEmailTemplateForTutor(
        tutorName,
        `Có ${totalReports} báo cáo vi phạm về tài khoản của bạn`,
        resolvedAt,
        tutorAction
      );

      // Sử dụng queue để gửi email nhanh chóng (không block request)
      await addEmailJob({
        from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
        to: tutorUserForEmail.email,
        subject: "Thông báo về báo cáo vi phạm - MatchTutor",
        html: emailTemplate,
      });
    }

      return {
         tutor: tutor.toObject() as ITutor,
         message: "Tutor hidden successfully and all related commitments/sessions processed"
      };
   }
}

export default new AdminTutorService();

