import ViolationReport from "../models/violationReport.model";
import LearningCommitment from "../models/learningCommitment.model";
import Student from "../models/student.model";
import Tutor from "../models/tutor.model";
import { IViolationReport } from "../types/types/violationReport";
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/error.response";
import { ViolationTypeEnum, ViolationStatusEnum } from "../types/enums/violationReport.enum";
import { Types } from "mongoose";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "../config/r2";
import { v4 as uuidv4 } from "uuid";
import { 
   getReportResolvedEmailTemplateForStudent,
   getReportResolvedEmailTemplateForTutor,
   getReportRejectedEmailTemplateForStudent
} from "../template/adminEmail";
import { getVietnamTime } from "../utils/date.util";
import { addEmailJob } from "../queues/email.queue";

export class ViolationReportService {
   /**
    * Upload evidence file lên R2
    */
   async uploadEvidenceFile(file: Express.Multer.File): Promise<string> {
      const fileKey = `violation-reports/${uuidv4()}-${file.originalname}`;
      const bucketName = process.env.R2_BUCKET_NAME;
      const publicUrl = process.env.R2_PUBLIC_URL;

      if (!bucketName || !publicUrl) {
         throw new BadRequestError("R2 bucket name or public URL is not configured.");
      }

      try {
         const params = {
            Bucket: bucketName,
            Key: fileKey,
            Body: file.buffer,
            ContentType: file.mimetype,
         };

         await s3Client.send(new PutObjectCommand(params));
         return `${publicUrl}/${fileKey}`;
      } catch (error) {
         throw new BadRequestError(`Failed to upload file: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
   }

   /**
    * Kiểm tra student có thể report tutor không
    * Student phải có ít nhất 1 learning commitment với tutor ở status completed hoặc cancelled
    * Và chưa có report đang PENDING hoặc RESOLVED
    */
   async canStudentReportTutor(studentUserId: string, tutorId: string): Promise<{
      canReport: boolean;
      hasReported: boolean; // true nếu đã report, false nếu chưa report
      reason?: string;
      existingReportId?: string;
   }> {
      // Tìm student profile
      const student = await Student.findOne({ userId: studentUserId }).select("_id");
      if (!student) {
         throw new NotFoundError("Student profile not found");
      }

      // Tìm tutor profile và userId
      const tutor = await Tutor.findById(tutorId).populate("userId", "_id").select("userId");
      if (!tutor) {
         throw new NotFoundError("Tutor not found");
      }

      const tutorUserId = (tutor.userId as any)?._id || tutor.userId;
      if (!tutorUserId) {
         throw new NotFoundError("Tutor user not found");
      }

      // Kiểm tra có learning commitment với status completed hoặc cancelled
      const commitment = await LearningCommitment.findOne({
         student: student._id,
         tutor: tutor._id,
         status: { $in: ["completed", "cancelled"] }
      });

      if (!commitment) {
         return {
            canReport: false,
            hasReported: false, // Chưa report, chỉ là chưa đủ điều kiện
            reason: "You can only report a tutor if you have at least one completed or cancelled learning commitment with them"
         };
      }

      // Kiểm tra xem đã có report chưa
      const existingReport = await ViolationReport.findOne({
         reporterId: new Types.ObjectId(studentUserId),
         reportedUserId: new Types.ObjectId(tutorUserId),
         status: { $in: [ViolationStatusEnum.PENDING, ViolationStatusEnum.RESOLVED] },
      }).select("_id status");

      if (existingReport) {
         return {
            canReport: false,
            hasReported: true, // Đã report rồi
            reason: "You have already reported this tutor. Please wait for the current report to be processed.",
            existingReportId: (existingReport._id as Types.ObjectId).toString()
         };
      }

      return { 
         canReport: true,
         hasReported: false // Có thể report
      };
   }

   /**
    * Tạo violation report từ student cho tutor
    */
   async createReport(
      reporterUserId: string,
      tutorId: string,
      data: {
         type?: ViolationTypeEnum;
         reason?: string;
         evidenceFiles?: string[];
         relatedTeachingRequestId?: string;
      }
   ): Promise<IViolationReport> {
      // Tìm student profile
      const student = await Student.findOne({ userId: reporterUserId }).select("_id");
      if (!student) {
         throw new NotFoundError("Student profile not found");
      }

      // Tìm tutor profile và userId
      const tutor = await Tutor.findById(tutorId).populate("userId", "_id").select("userId");
      if (!tutor) {
         throw new NotFoundError("Tutor not found");
      }

      const tutorUserId = (tutor.userId as any)?._id || tutor.userId;
      if (!tutorUserId) {
         throw new NotFoundError("Tutor user not found");
      }

      // Kiểm tra student có thể report tutor (bao gồm kiểm tra duplicate)
      const checkResult = await this.canStudentReportTutor(reporterUserId, tutorId);
      if (!checkResult.canReport) {
         throw new BadRequestError(
            checkResult.reason || "Cannot report this tutor"
         );
      }

      // Tạo violation report
      const report = new ViolationReport({
         type: data.type,
         reporterId: new Types.ObjectId(reporterUserId),
         reportedUserId: new Types.ObjectId(tutorUserId),
         relatedTeachingRequestId: data.relatedTeachingRequestId
            ? new Types.ObjectId(data.relatedTeachingRequestId)
            : undefined,
         reason: data.reason,
         evidenceFiles: data.evidenceFiles || [],
         status: ViolationStatusEnum.PENDING,
      });

      await report.save();
      return report;
   }

   /**
    * Lấy danh sách violation reports (cho admin)
    */
   async getReports(query: {
      page?: number;
      limit?: number;
      status?: ViolationStatusEnum;
      type?: ViolationTypeEnum;
   }) {
      const { page = 1, limit = 10, status, type } = query;
      const skip = (page - 1) * limit;

      const filter: any = {};
      if (status) filter.status = status;
      if (type) filter.type = type;

      const [reports, total] = await Promise.all([
         ViolationReport.find(filter)
            .populate("reporterId", "name email")
            .populate("reportedUserId", "name email")
            .populate("relatedTeachingRequestId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         ViolationReport.countDocuments(filter),
      ]);

      return {
         reports,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   /**
    * Lấy danh sách violation reports mà student đã tạo (cho student xem)
    */
   async getReportsByStudent(
      studentUserId: string,
      query: {
         page?: number;
         limit?: number;
         status?: ViolationStatusEnum;
         type?: ViolationTypeEnum;
      }
   ) {
      const { page = 1, limit = 10, status, type } = query;
      const skip = (page - 1) * limit;

      const filter: any = {
         reporterId: new Types.ObjectId(studentUserId),
      };
      if (status) filter.status = status;
      if (type) filter.type = type;

      const [reports, total] = await Promise.all([
         ViolationReport.find(filter)
            .populate("reportedUserId", "name email")
            .populate("relatedTeachingRequestId")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         ViolationReport.countDocuments(filter),
      ]);

      return {
         reports,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   /**
    * Cập nhật status của violation report (cho admin)
    */
   async updateReportStatus(
      reportId: string,
      status: ViolationStatusEnum,
      adminId: string
   ): Promise<IViolationReport> {
      const report = await ViolationReport.findById(reportId)
         .populate("reporterId", "name email")
         .populate("reportedUserId", "name email");
      if (!report) {
         throw new NotFoundError("Violation report not found");
      }

      const oldStatus = report.status;
      report.status = status;
      await report.save();

      // Gửi email thông báo cho student và tutor
      const resolvedAt = getVietnamTime().toLocaleString("vi-VN", {
         timeZone: "Asia/Ho_Chi_Minh",
         year: "numeric",
         month: "long",
         day: "numeric",
         hour: "2-digit",
         minute: "2-digit",
      });

      const reporter = report.reporterId as any;
      const reportedUser = report.reportedUserId as any;

      if (status === ViolationStatusEnum.RESOLVED) {
         // Gửi email cho student (reporter)
         if (reporter && reporter.email) {
            const action = "Hồ sơ gia sư đã bị ẩn và các cam kết học tập liên quan đã được xử lý.";
            const emailTemplate = getReportResolvedEmailTemplateForStudent(
               reporter.name || "Học sinh",
               reportedUser?.name || "Gia sư",
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

         // Gửi email cho tutor (reported user)
         if (reportedUser && reportedUser.email) {
            const action = "Hồ sơ của bạn đã bị ẩn do vi phạm quy tắc cộng đồng. Các cam kết học tập và buổi học liên quan đã được hủy.";
            const emailTemplate = getReportResolvedEmailTemplateForTutor(
               reportedUser.name || "Gia sư",
               report.reason || "Không có lý do cụ thể",
               resolvedAt,
               action
            );

            // Sử dụng queue để gửi email nhanh chóng (không block request)
            await addEmailJob({
               from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
               to: reportedUser.email,
               subject: "Thông báo về báo cáo vi phạm - MatchTutor",
               html: emailTemplate,
            });
         }
      } else if (status === ViolationStatusEnum.REJECTED) {
         // Gửi email cho student khi report bị từ chối
         if (reporter && reporter.email) {
            const emailTemplate = getReportRejectedEmailTemplateForStudent(
               reporter.name || "Học sinh",
               reportedUser?.name || "Gia sư",
               report.reason || "Không có lý do cụ thể",
               resolvedAt
            );

            // Sử dụng queue để gửi email nhanh chóng (không block request)
            await addEmailJob({
               from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
               to: reporter.email,
               subject: "Báo cáo vi phạm không được chấp nhận - MatchTutor",
               html: emailTemplate,
            });
         }
      }

      return report;
   }
}

export default new ViolationReportService();


