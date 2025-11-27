import ViolationReport from "../models/violationReport.model";
import LearningCommitment from "../models/learningCommitment.model";
import Student from "../models/student.model";
import Tutor from "../models/tutor.model";
import { IViolationReport } from "../types/types/violationReport";
import { BadRequestError, NotFoundError, ForbiddenError } from "../utils/error.response";
import { ViolationTypeEnum, ViolationStatusEnum } from "../types/enums/violationReport.enum";
import { Types } from "mongoose";

export class ViolationReportService {
   /**
    * Kiểm tra student có thể report tutor không
    * Student phải có ít nhất 1 learning commitment với tutor ở status completed hoặc cancelled
    */
   async canStudentReportTutor(studentUserId: string, tutorId: string): Promise<boolean> {
      // Tìm student profile
      const student = await Student.findOne({ userId: studentUserId }).select("_id");
      if (!student) {
         throw new NotFoundError("Student profile not found");
      }

      // Tìm tutor profile
      const tutor = await Tutor.findById(tutorId).select("_id");
      if (!tutor) {
         throw new NotFoundError("Tutor not found");
      }

      // Kiểm tra có learning commitment với status completed hoặc cancelled
      const commitment = await LearningCommitment.findOne({
         student: student._id,
         tutor: tutor._id,
         status: { $in: ["completed", "cancelled"] }
      });

      return !!commitment;
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

      // Kiểm tra student có thể report tutor
      const canReport = await this.canStudentReportTutor(reporterUserId, tutorId);
      if (!canReport) {
         throw new ForbiddenError(
            "You can only report a tutor if you have at least one completed or cancelled learning commitment with them"
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
    * Cập nhật status của violation report (cho admin)
    */
   async updateReportStatus(
      reportId: string,
      status: ViolationStatusEnum,
      adminId: string
   ): Promise<IViolationReport> {
      const report = await ViolationReport.findById(reportId);
      if (!report) {
         throw new NotFoundError("Violation report not found");
      }

      report.status = status;
      await report.save();

      return report;
   }
}

export default new ViolationReportService();


