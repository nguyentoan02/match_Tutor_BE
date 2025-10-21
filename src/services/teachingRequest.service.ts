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
import {
   DecisionStatus,
   TeachingRequestStatus,
} from "../types/enums/teachingRequest.enum";
import { Role } from "../types/enums/role.enum";
import { IUser } from "../types/types/user";
import { CreateTeachingRequestBody } from "../schemas/teachingRequest.schema";
import { ITutor } from "../types/types/tutor";
import mongoose from "mongoose";

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
            $nin: [
               TeachingRequestStatus.CANCELLED,
               TeachingRequestStatus.REJECTED,
               TeachingRequestStatus.COMPLETED,
            ],
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
            ? TeachingRequestStatus.IN_PROGRESS
            : TeachingRequestStatus.REJECTED;
      await request.save();
      return request;
   }

   async requestCancellation(
      requestId: string,
      currentUser: IUser,
      reason: string
   ) {
      const request = await TeachingRequest.findById(requestId);
      if (!request) throw new NotFoundError("Teaching request not found");

      if (request.status !== TeachingRequestStatus.IN_PROGRESS) {
         throw new BadRequestError(
            "Only ongoing courses can be requested for cancellation."
         );
      }

      // Nếu đã có lần review trước, push vào history
      if (request.cancellationDecision?.adminResolvedAt) {
         if (!request.cancellationDecisionHistory) {
            request.cancellationDecisionHistory = [];
         }
         request.cancellationDecisionHistory.push({
            ...request.cancellationDecision,
            resolvedDate: new Date(),
         });
      }

      // Khởi tạo lần yêu cầu mới, reset các trường admin
      const requestedBy = currentUser.role.toLowerCase() as "student" | "tutor";
      request.status = TeachingRequestStatus.CANCELLATION_PENDING;
      request.cancellationDecision = {
         student: {
            decision:
               requestedBy === "student"
                  ? DecisionStatus.ACCEPTED
                  : DecisionStatus.PENDING,
            reason: requestedBy === "student" ? reason : undefined,
         },
         tutor: {
            decision:
               requestedBy === "tutor"
                  ? DecisionStatus.ACCEPTED
                  : DecisionStatus.PENDING,
            reason: requestedBy === "tutor" ? reason : undefined,
         },
         requestedBy,
         requestedAt: new Date(),
         reason, // Initiator's reason
         adminReviewRequired: false,
         adminResolvedBy: undefined,
         adminResolvedAt: undefined,
         adminNotes: undefined,
      };

      await request.save();
      return request;
   }

   async requestCompletion(
      requestId: string,
      currentUser: IUser,
      reason?: string
   ) {
      const request = await TeachingRequest.findById(requestId);
      if (!request) throw new NotFoundError("Teaching request not found");

      if (request.status !== TeachingRequestStatus.IN_PROGRESS) {
         throw new BadRequestError(
            "Only ongoing courses can be requested for completion."
         );
      }

      // Preserve previous admin resolution
      if (request.complete_pending?.adminResolvedAt) {
         if (!request.complete_pendingHistory) {
            request.complete_pendingHistory = [];
         }
         request.complete_pendingHistory.push({
            ...request.complete_pending,
            resolvedDate: new Date(),
         });
      }

      // Khởi tạo lần yêu cầu mới, reset các trường admin
      const requestedBy = currentUser.role.toLowerCase() as "student" | "tutor";
      request.status = TeachingRequestStatus.COMPLETE_PENDING;
      request.complete_pending = {
         student: {
            decision:
               requestedBy === "student"
                  ? DecisionStatus.ACCEPTED
                  : DecisionStatus.PENDING,
            reason: requestedBy === "student" ? reason : undefined,
         },
         tutor: {
            decision:
               requestedBy === "tutor"
                  ? DecisionStatus.ACCEPTED
                  : DecisionStatus.PENDING,
            reason: requestedBy === "tutor" ? reason : undefined,
         },
         requestedBy,
         requestedAt: new Date(),
         reason,
         studentConfirmedAt: undefined,
         tutorConfirmedAt: undefined,
         adminReviewRequired: false,
         adminResolvedBy: undefined,
         adminResolvedAt: undefined,
         adminNotes: undefined,
      };

      await request.save();
      return request;
   }

   async confirmAction(
      requestId: string,
      currentUser: IUser,
      action: "cancellation" | "completion",
      decision: "ACCEPTED" | "REJECTED",
      reason?: string // Add reason parameter
   ) {
      const request = await TeachingRequest.findById(requestId);
      if (!request) throw new NotFoundError("Teaching request not found");

      const decisionField =
         action === "cancellation"
            ? "cancellationDecision"
            : "complete_pending";
      const pendingStatus =
         action === "cancellation"
            ? TeachingRequestStatus.CANCELLATION_PENDING
            : TeachingRequestStatus.COMPLETE_PENDING;
      const finalStatus =
         action === "cancellation"
            ? TeachingRequestStatus.CANCELLED
            : TeachingRequestStatus.COMPLETED;

      if (request.status !== pendingStatus) {
         throw new BadRequestError(`This request is not pending ${action}.`);
      }

      const userRole = currentUser.role.toLowerCase() as "student" | "tutor";
      const decisionData = request[decisionField];

      if (
         !decisionData ||
         decisionData[userRole].decision !== DecisionStatus.PENDING
      ) {
         throw new BadRequestError(
            "You have already responded or cannot respond at this time."
         );
      }

      decisionData[userRole].decision = decision;
      decisionData[userRole].reason = reason; // Save the reason

      if (decision === "ACCEPTED") {
         if (
            decisionData.student.decision === DecisionStatus.ACCEPTED &&
            decisionData.tutor.decision === DecisionStatus.ACCEPTED
         ) {
            request.status = finalStatus;
         }
      } else {
         decisionData.adminReviewRequired = true;
         request.status = TeachingRequestStatus.ADMIN_REVIEW;
      }

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

   async listForStudent(studentUserId: string) {
      const student = await Student.findOne({ userId: studentUserId }).select(
         "_id"
      );
      if (!student) throw new NotFoundError("Student profile not found");

      return TeachingRequest.find({ studentId: student._id })
         .populate({
            path: "tutorId",
            select: "userId",
            populate: { path: "userId", select: "name avatarUrl" },
         })
         .sort({ createdAt: -1 });
   }

   async listForTutor(tutorUserId: string) {
      const tutor = await Tutor.findOne({ userId: tutorUserId }).select("_id");
      if (!tutor) throw new NotFoundError("Tutor profile not found");

      return TeachingRequest.find({ tutorId: tutor._id })
         .populate({
            path: "studentId",
            select: "userId",
            populate: { path: "userId", select: "name avatarUrl" },
         })
         .sort({ createdAt: -1 });
   }

   // GET pending admin‐review
   async getRequestsForAdminReview(query: { page: number; limit: number }) {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      const filter: any = {
         $or: [
            { "cancellationDecision.adminReviewRequired": true },
            { "complete_pending.adminReviewRequired": true },
         ],
      };

      const [requests, total] = await Promise.all([
         TeachingRequest.find(filter)
            .populate({
               path: "studentId",
               select: "userId",
               populate: {
                  path: "userId",
                  select: "name email avatarUrl",
               },
            })
            .populate({
               path: "tutorId",
               select: "userId",
               populate: {
                  path: "userId",
                  select: "name email avatarUrl",
               },
            })
            .populate({
               path: "createdBy",
               select: "name email",
            })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         TeachingRequest.countDocuments(filter),
      ]);

      return {
         requests,
         pagination: { page, limit, total },
      };
   }

   // GET resolved admin‐review
   async getResolvedRequestsForAdminReview(query: {
      page: number;
      limit: number;
   }) {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Only requests with at least one cancellation or completion history entry
      const filter: any = {
         $or: [
            { "cancellationDecisionHistory.0": { $exists: true } },
            { "complete_pendingHistory.0": { $exists: true } },
         ],
      };

      const [requests, total] = await Promise.all([
         TeachingRequest.find(filter)
            .populate({
               path: "studentId",
               select: "userId",
               populate: {
                  path: "userId",
                  select: "name email avatarUrl",
               },
            })
            .populate({
               path: "tutorId",
               select: "userId",
               populate: {
                  path: "userId",
                  select: "name email avatarUrl",
               },
            })
            .populate({
               path: "createdBy",
               select: "name email",
            })
            .sort({ updatedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         TeachingRequest.countDocuments(filter),
      ]);

      return {
         requests,
         pagination: { page, limit, total },
      };
   }

   // GET recently resolved admin-review
   async getRecentlyResolvedAdminReviews(query: {
      page: number;
      limit: number;
   }) {
      const page = query.page || 1;
      const limit = query.limit || 10;
      const skip = (page - 1) * limit;

      // Find requests where an admin resolution has occurred in the main decision object
      const filter: any = {
         $or: [
            {
               "cancellationDecision.adminResolvedAt": {
                  $exists: true,
                  $ne: null,
               },
            },
            {
               "complete_pending.adminResolvedAt": { $exists: true, $ne: null },
            },
         ],
      };

      const [requests, total] = await Promise.all([
         TeachingRequest.find(filter)
            .populate({
               path: "studentId",
               select: "userId",
               populate: {
                  path: "userId",
                  select: "name email avatarUrl",
               },
            })
            .populate({
               path: "tutorId",
               select: "userId",
               populate: {
                  path: "userId",
                  select: "name email avatarUrl",
               },
            })
            .populate({
               path: "createdBy",
               select: "name email",
            })
            .sort({ updatedAt: -1 }) // Sort by the most recent update
            .skip(skip)
            .limit(limit)
            .lean(),
         TeachingRequest.countDocuments(filter),
      ]);

      return {
         requests,
         pagination: { page, limit, total, pages: Math.ceil(total / limit) },
      };
   }

   async resolveAdminReview(
      requestId: string,
      adminUserId: string,
      decision: "ACCEPTED" | "REJECTED",
      adminNotes?: string
   ) {
      const request = await TeachingRequest.findById(requestId);
      if (!request) {
         throw new NotFoundError("Teaching request not found");
      }

      const now = new Date();
      let resolved = false;

      // Check and resolve cancellation review
      if (request.cancellationDecision?.adminReviewRequired) {
         if (decision === "ACCEPTED") {
            request.status = TeachingRequestStatus.CANCELLED;
         } else {
            request.status = TeachingRequestStatus.IN_PROGRESS;
         }

         request.cancellationDecision.adminReviewRequired = false;
         request.cancellationDecision.adminResolvedBy =
            new mongoose.Types.ObjectId(adminUserId);
         request.cancellationDecision.adminResolvedAt = now;
         request.cancellationDecision.adminNotes = adminNotes;
         resolved = true;
      }

      // Check and resolve completion review
      if (request.complete_pending?.adminReviewRequired) {
         if (decision === "ACCEPTED") {
            request.status = TeachingRequestStatus.COMPLETED;
         } else {
            request.status = TeachingRequestStatus.IN_PROGRESS;
         }

         request.complete_pending.adminReviewRequired = false;
         request.complete_pending.adminResolvedBy = new mongoose.Types.ObjectId(
            adminUserId
         );
         request.complete_pending.adminResolvedAt = now;
         request.complete_pending.adminNotes = adminNotes;
         resolved = true;
      }

      if (!resolved) {
         throw new BadRequestError("No admin review required for this request");
      }

      await request.save();
      return request;
   }

   // NEW: Method to get admin review history for a specific request
   async getAdminReviewHistory(requestId: string) {
      const request = await TeachingRequest.findById(requestId)
         .select("cancellationDecisionHistory complete_pendingHistory")
         .populate({
            path: "cancellationDecisionHistory.adminResolvedBy",
            select: "name email",
         })
         .populate({
            path: "complete_pendingHistory.adminResolvedBy",
            select: "name email",
         });

      if (!request) {
         throw new NotFoundError("Teaching request not found");
      }

      return {
         cancellationHistory: request.cancellationDecisionHistory || [],
         completionHistory: request.complete_pendingHistory || [],
      };
   }

   async getCompletedRequestBetween(studentUserId: string, tutorId: string) {
      const student = await Student.findOne({ userId: studentUserId }).select(
         "_id"
      );
      if (!student) throw new NotFoundError("Student profile not found");

      const request = await TeachingRequest.findOne({
         studentId: student._id,
         tutorId,
         status: TeachingRequestStatus.COMPLETED,
      }).select("_id");

      return request;
   }
}

export default new TeachingRequestService();
