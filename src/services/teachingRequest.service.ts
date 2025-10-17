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
            ? TeachingRequestStatus.TRIAL_ACCEPTED
            : TeachingRequestStatus.REJECTED;
      await request.save();
      return request;
   }

   async makeTrialDecision(
      requestId: string,
      currentUser: IUser,
      decision: DecisionStatus
   ) {
      const request = await TeachingRequest.findById(requestId).populate<{
         tutorId: ITutor;
      }>("tutorId");
      if (!request) throw new NotFoundError("Teaching request not found");

      if (request.status !== TeachingRequestStatus.TRIAL_COMPLETED) {
         throw new BadRequestError(
            "A decision can only be made after the trial period is completed."
         );
      }
      if (!request.trialDecision) {
         throw new InternalServerError(
            "Trial decision data is missing for this request."
         );
      }

      const userRole = currentUser.role;
      let isParticipant = false;

      if (userRole === Role.STUDENT) {
         const student = await Student.findOne({ userId: currentUser._id });
         if (student && String(request.studentId) === String(student._id)) {
            isParticipant = true;
            request.trialDecision.student = decision;
         }
      } else if (userRole === Role.TUTOR) {
         if (
            request.tutorId &&
            String((request.tutorId as any).userId) === String(currentUser._id)
         ) {
            isParticipant = true;
            request.trialDecision.tutor = decision;
         }
      }

      if (!isParticipant) {
         throw new ForbiddenError(
            "You are not a participant in this teaching request."
         );
      }

      const { student: studentDecision, tutor: tutorDecision } =
         request.trialDecision;
      if (
         studentDecision !== DecisionStatus.PENDING &&
         tutorDecision !== DecisionStatus.PENDING
      ) {
         request.status =
            studentDecision === DecisionStatus.ACCEPTED &&
               tutorDecision === DecisionStatus.ACCEPTED
               ? TeachingRequestStatus.IN_PROGRESS
               : TeachingRequestStatus.CANCELLED;
      }

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

      const requestedBy = currentUser.role.toLowerCase() as "student" | "tutor";
      request.status = TeachingRequestStatus.CANCELLATION_PENDING;
      request.cancellationDecision = {
         student:
            requestedBy === "student"
               ? DecisionStatus.ACCEPTED
               : DecisionStatus.PENDING,
         tutor:
            requestedBy === "tutor"
               ? DecisionStatus.ACCEPTED
               : DecisionStatus.PENDING,
         requestedBy,
         requestedAt: new Date(),
         reason,
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

      const requestedBy = currentUser.role.toLowerCase() as "student" | "tutor";
      request.status = TeachingRequestStatus.COMPLETE_PENDING;
      request.complete_pending = {
         student:
            requestedBy === "student"
               ? DecisionStatus.ACCEPTED
               : DecisionStatus.PENDING,
         tutor:
            requestedBy === "tutor"
               ? DecisionStatus.ACCEPTED
               : DecisionStatus.PENDING,
         requestedBy,
         requestedAt: new Date(),
         reason,
      };

      await request.save();
      return request;
   }

   async confirmAction(
      requestId: string,
      currentUser: IUser,
      action: "cancellation" | "completion",
      decision: "ACCEPTED" | "REJECTED"
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

      if (!decisionData || decisionData[userRole] !== DecisionStatus.PENDING) {
         throw new BadRequestError(
            "You have already responded or cannot respond at this time."
         );
      }

      decisionData[userRole] = decision;

      if (decision === "ACCEPTED") {
         if (
            decisionData.student === DecisionStatus.ACCEPTED &&
            decisionData.tutor === DecisionStatus.ACCEPTED
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

   async getCompletedRequestBetween(studentUserId: string, tutorId: string) {
      const student = await Student.findOne({ userId: studentUserId }).select("_id");
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
