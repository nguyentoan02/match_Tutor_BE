import TeachingRequest from "../models/teachingRequest.model";
import Student from "../models/student.model";
import Tutor from "../models/tutor.model";
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
   async create(studentUserId: string, data: CreateTeachingRequestBody) {
      const student = await Student.findOne({ userId: studentUserId });
      if (!student) throw new NotFoundError("Student profile not found");

      const tutor = await Tutor.findById(data.tutorId);
      if (!tutor) throw new NotFoundError("Tutor not found");

      const existing = await TeachingRequest.findOne({
         studentId: student._id,
         tutorId: tutor._id,
         status: {
            $nin: [TeachingRequestStatus.REJECTED],
         },
      });

      if (existing) {
         throw new ConflictError(
            "An active or pending request with this tutor already exists."
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
