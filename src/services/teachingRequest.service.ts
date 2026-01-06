import TeachingRequest from "../models/teachingRequest.model";
import Student from "../models/student.model";
import Tutor from "../models/tutor.model";
import SuggestionSchedules from "../models/suggestSchedules.model";
import {
   ConflictError,
   ForbiddenError,
   InternalServerError,
   NotFoundError,
   BadRequestError,
} from "../utils/error.response";
import { TeachingRequestStatus } from "../types/enums/teachingRequest.enum";
import { CreateTeachingRequestBody } from "../schemas/teachingRequest.schema";

class TeachingRequestService {
   /**
    * Tính thời gian cách đây X phút
    */
   private getTimeAgo(minutes: number): Date {
      return new Date(Date.now() - minutes * 60 * 1000);
   }

   async create(studentUserId: string, data: CreateTeachingRequestBody) {
      const student = await Student.findOne({ userId: studentUserId });
      if (!student)
         throw new NotFoundError(
            "Không tìm thấy hồ sơ học sinh của bạn. Vui lòng tạo hồ sơ trước khi gửi yêu cầu"
         );

      const tutor = await Tutor.findById(data.tutorId);
      if (!tutor) throw new NotFoundError("Tutor not found");

      const existing = await TeachingRequest.findOne({
         studentId: student._id,
         tutorId: tutor._id,
         subject: data.subject,
         status: {
            $in: [
               TeachingRequestStatus.PENDING,
               TeachingRequestStatus.ACCEPTED,
            ],
         },
      });

      if (existing) {
         throw new ConflictError(
            "Bạn đã gửi yêu cầu cho gia sư này với môn học này trước đó."
         );
      }

      const newRequest = await TeachingRequest.create({
         ...data,
         studentId: student._id,
         createdBy: studentUserId,
      });

      if (!newRequest) {
         throw new InternalServerError("Failed to create teaching request");
      }

      // Giảm maxStudents của tutor đi 1
      tutor.maxStudents = Math.max(0, tutor.maxStudents - 1);
      await tutor.save();

      return newRequest;
   }

   async respondToRequest(
      requestId: string,
      tutorUserId: string,
      decision: "ACCEPTED" | "REJECTED"
   ) {
      const request = await TeachingRequest.findById(requestId);
      if (!request) throw new NotFoundError("Teaching request not found");

      const tutor = await Tutor.findOne({ userId: tutorUserId });
      if (
         !tutor ||
         !request.tutorId ||
         String(request.tutorId) !== String(tutor._id)
      ) {
         throw new ForbiddenError(
            "You are not the designated tutor for this request."
         );
      }

      if (request.status !== TeachingRequestStatus.PENDING) {
         throw new BadRequestError(
            "This request is no longer pending a response."
         );
      }

      request.status =
         decision === "ACCEPTED"
            ? TeachingRequestStatus.ACCEPTED
            : TeachingRequestStatus.REJECTED;
      await request.save();

      // Nếu từ chối thì hoàn lại 1 slot cho tutor
      if (decision === "REJECTED") {
         tutor.maxStudents = (tutor.maxStudents || 0) + 1;
         await tutor.save();
      }

      return request;
   }

   async getById(requestId: string) {
      const request = await TeachingRequest.findById(requestId)
         .populate({
            path: "studentId",
            select: "userId",
            populate: { path: "userId", select: "name avatarUrl" },
         })
         .populate({
            path: "tutorId",
            select: "userId",
            populate: { path: "userId", select: "name avatarUrl" },
         });
      if (!request) throw new NotFoundError("Teaching request not found");
      return request;
   }

   /**
    * Kiểm tra và tự động từ chối các suggestion schedules
    * nếu học sinh không phản hồi sau 1 ngày
    */
   async autoRejectExpiredSuggestions(teachingRequestId: string) {
      const oneDayAgo = this.getTimeAgo(24 * 60); // 1 ngày

      const expiredSuggestions = await SuggestionSchedules.find({
         teachingRequestId,
         status: "PENDING",
         "studentResponse.status": "PENDING",
         createdAt: { $lte: oneDayAgo },
      });

      if (expiredSuggestions.length > 0) {
         await SuggestionSchedules.updateMany(
            {
               teachingRequestId,
               status: "PENDING",
               "studentResponse.status": "PENDING",
               createdAt: { $lte: oneDayAgo },
            },
            {
               $set: {
                  status: "REJECTED",
                  "studentResponse.status": "REJECTED",
                  "studentResponse.reason":
                     "Tự động từ chối do không phản hồi sau 1 ngày",
                  "studentResponse.respondedAt": new Date(),
               },
            }
         );
      }

      return expiredSuggestions.length;
   }

   async listForStudent(studentUserId: string, page = 1, limit = 10) {
      const student = await Student.findOne({ userId: studentUserId }).select(
         "_id"
      );
      if (!student) throw new NotFoundError("Student profile not found");

      const maxLimit = 100;
      const safeLimit = Math.min(Math.max(1, Number(limit) || 10), maxLimit);
      const safePage = Math.max(1, Number(page) || 1);
      const skip = (safePage - 1) * safeLimit;

      const filter = { studentId: student._id };

      const total = await TeachingRequest.countDocuments(filter);
      const data = await TeachingRequest.find(filter)
         .populate({
            path: "tutorId",
            select: "userId",
            populate: { path: "userId", select: "name avatarUrl" },
         })
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(safeLimit);

      // Tự động từ chối các suggestion schedules hết hạn cho mỗi teaching request
      for (const request of data) {
         await this.autoRejectExpiredSuggestions(String(request._id));
      }

      const totalPages = Math.max(1, Math.ceil(total / safeLimit));

      return {
         data,
         pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages,
         },
      };
   }

   async listForTutor(tutorUserId: string, page = 1, limit = 10) {
      const tutor = await Tutor.findOne({ userId: tutorUserId }).select("_id");
      if (!tutor) throw new NotFoundError("Tutor profile not found");

      const maxLimit = 100;
      const safeLimit = Math.min(Math.max(1, Number(limit) || 10), maxLimit);
      const safePage = Math.max(1, Number(page) || 1);
      const skip = (safePage - 1) * safeLimit;

      const filter = { tutorId: tutor._id };

      const total = await TeachingRequest.countDocuments(filter);
      const data = await TeachingRequest.find(filter)
         .populate({
            path: "studentId",
            select: "userId",
            populate: { path: "userId", select: "name avatarUrl" },
         })
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(safeLimit);

      // Tự động từ chối các suggestion schedules hết hạn cho mỗi teaching request
      for (const request of data) {
         await this.autoRejectExpiredSuggestions(String(request._id));
      }

      const totalPages = Math.max(1, Math.ceil(total / safeLimit));

      return {
         data,
         pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages,
         },
      };
   }

   async getStudentProfile(studentId: string) {
      const student = await Student.findById(studentId).populate({
         path: "userId",
         select: "name email phone avatarUrl gender address",
      });
      if (!student) throw new NotFoundError("Student profile not found");
      return student;
   }
}

export default new TeachingRequestService();
