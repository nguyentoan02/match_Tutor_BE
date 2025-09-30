import Session from "../models/session.model";
import TeachingRequest from "../models/teachingRequest.model";
import Tutor from "../models/tutor.model"; // <-- added import
import Student from "../models/student.model";
import {
   CreateSessionBody,
   UpdateSessionBody,
} from "../schemas/session.schema";
import {
   TeachingRequestStatus,
   DecisionStatus,
} from "../types/enums/teachingRequest.enum";
import {
   BadRequestError,
   ForbiddenError,
   NotFoundError,
} from "../utils/error.response";
import { IUser } from "../types/types/user";
import { Role } from "../types/enums/role.enum";
import { SessionStatus } from "../types/enums/session.enum";
import mongoose from "mongoose";

class SessionService {
   private async checkParticipant(teachingRequestId: string, userId: string) {
      const request = await TeachingRequest.findById(teachingRequestId)
         .populate({
            path: "studentId",
            select: "userId",
            populate: {
               path: "userId",
               select: "_id",
            },
         })
         .populate({
            path: "tutorId",
            select: "userId",
            populate: {
               path: "userId",
               select: "_id",
            },
         });

      if (!request) {
         throw new NotFoundError("Teaching request not found");
      }

      // Convert userId to string to ensure proper comparison
      const userIdStr = userId.toString();
      // Sửa lại cách truy cập _id từ document được populate
      const studentUserId = (request.studentId as any)?.userId?._id?.toString();
      const tutorUserId = (request.tutorId as any)?.userId?._id?.toString();

      if (userIdStr !== studentUserId && userIdStr !== tutorUserId) {
         throw new ForbiddenError(
            "You are not a participant of this teaching request."
         );
      }
      return request;
   }

   // Modified create: chỉ tutor được phép tạo session cho teachingRequest đó
   async create(data: CreateSessionBody, currentUser: IUser) {
      const request = await TeachingRequest.findById(data.teachingRequestId);
      if (!request) throw new NotFoundError("Teaching request not found");

      // Chỉ gia sư (TUTOR) được tạo session
      if (currentUser.role !== Role.TUTOR) {
         throw new ForbiddenError(
            "Only the assigned tutor can create sessions."
         );
      }

      const tutor = await Tutor.findOne({ userId: currentUser._id });
      if (
         !tutor ||
         !request.tutorId ||
         String(request.tutorId) !== String(tutor._id)
      ) {
         throw new ForbiddenError(
            "You are not the designated tutor for this teaching request."
         );
      }

      // Validate request state for trial / regular sessions
      if (data.isTrial) {
         if (
            ![
               TeachingRequestStatus.TRIAL_ACCEPTED,
               TeachingRequestStatus.TRIAL_SCHEDULED,
            ].includes(request.status as TeachingRequestStatus)
         ) {
            throw new BadRequestError(
               "Trial sessions can only be created when the request is in TRIAL_ACCEPTED or TRIAL_SCHEDULED status."
            );
         }

         const trialSessionCount = await Session.countDocuments({
            teachingRequestId: data.teachingRequestId,
            isTrial: true,
         });

         if (trialSessionCount >= 2) {
            throw new BadRequestError(
               "A maximum of 2 trial sessions can be created."
            );
         }
      } else {
         if (request.status !== TeachingRequestStatus.IN_PROGRESS) {
            throw new BadRequestError(
               "Regular sessions can only be created for ongoing courses (IN_PROGRESS)."
            );
         }
      }

      // --- NEW: check overlapping sessions for tutor AND for the student assigned to the request
      // Parse times
      const newStart = new Date(data.startTime);
      const newEnd = new Date(data.endTime);
      if (!(newStart < newEnd)) {
         throw new BadRequestError("startTime must be before endTime");
      }

      // Tutor conflicts: find all teachingRequest ids assigned to this tutor
      const tutorRequests = await TeachingRequest.find({ tutorId: tutor._id })
         .select("_id")
         .lean();
      const tutorReqIds = tutorRequests.map((r) => r._id);

      const tutorConflict = await Session.findOne({
         teachingRequestId: { $in: tutorReqIds },
         $or: [{ startTime: { $lt: newEnd }, endTime: { $gt: newStart } }],
      }).lean();

      if (tutorConflict) {
         throw new BadRequestError(
            "You have a conflicting session at this time (tutor)."
         );
      }

      // Student conflicts: find student record for the request.studentId (may be ObjectId)
      const studentIdObj = request.studentId;
      if (studentIdObj) {
         // get all teachingRequest ids for that student
         const studentRequests = await TeachingRequest.find({
            studentId: studentIdObj,
         })
            .select("_id")
            .lean();
         const studentReqIds = studentRequests.map((r) => r._id);

         const studentConflict = await Session.findOne({
            teachingRequestId: { $in: studentReqIds },
            $or: [{ startTime: { $lt: newEnd }, endTime: { $gt: newStart } }],
         }).lean();

         if (studentConflict) {
            throw new BadRequestError(
               "Student has a conflicting session at this time."
            );
         }
      }
      // --- END NEW

      const newSession = await Session.create({
         ...data,
         createdBy: currentUser._id,
      });

      // Cập nhật trạng thái của teaching request nếu cần
      if (
         data.isTrial &&
         request.status === TeachingRequestStatus.TRIAL_ACCEPTED
      ) {
         request.status = TeachingRequestStatus.TRIAL_SCHEDULED;
         await request.save();
      }

      return newSession;
   }

   async getById(sessionId: string, userId: string) {
      const session = await Session.findById(sessionId)
         .populate({
            path: "teachingRequestId",
            select: "studentId tutorId subject level",
            populate: [
               {
                  path: "studentId",
                  select: "userId",
                  populate: { path: "userId", select: "_id name avatarUrl" },
               },
               {
                  path: "tutorId",
                  select: "userId",
                  populate: { path: "userId", select: "_id name avatarUrl" },
               },
            ],
         })
         .lean();

      if (!session) throw new NotFoundError("Session not found");

      // Ensure userId is converted to string before passing to checkParticipant
      await this.checkParticipant(
         session.teachingRequestId._id.toString(),
         userId.toString()
      );
      return session;
   }

   async listByTeachingRequest(teachingRequestId: string, userId: string) {
      await this.checkParticipant(teachingRequestId, userId);
      const sessions = await Session.find({ teachingRequestId }).sort({
         startTime: "asc",
      });
      return sessions;
   }

   // --- NEW: List all sessions for a given user (either as student or as tutor)
   async listForUser(userId: string) {
      // find tutor and student records (either can be present)
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      const student = await Student.findOne({ userId }).select("_id").lean();

      const requestFilters: any[] = [];
      if (tutor) requestFilters.push({ tutorId: tutor._id });
      if (student) requestFilters.push({ studentId: student._id });

      if (requestFilters.length === 0) {
         // user has neither student nor tutor profile -> no sessions
         return [];
      }

      // Find teachingRequest ids matching either role
      const requests = await TeachingRequest.find({ $or: requestFilters })
         .select("_id")
         .lean();
      const requestIds = requests.map((r) => r._id);

      if (requestIds.length === 0) return [];

      // Return sessions for those teaching requests, sorted
      const sessions = await Session.find({
         teachingRequestId: { $in: requestIds },
      })
         .sort({ startTime: "asc" })
         .populate({
            path: "teachingRequestId",
            select: "studentId tutorId subject level",
            populate: [
               {
                  path: "studentId",
                  select: "userId",
                  populate: { path: "userId", select: "name avatarUrl" },
               },
               {
                  path: "tutorId",
                  select: "userId",
                  populate: { path: "userId", select: "name avatarUrl" },
               },
            ],
         });

      return sessions;
   }
   // --- END NEW

   async update(
      sessionId: string,
      data: UpdateSessionBody,
      currentUser: IUser
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      await this.checkParticipant(
         session.teachingRequestId.toString(),
         (currentUser._id as mongoose.Types.ObjectId | string).toString()
      );

      Object.assign(session, data);

      // Logic khi buổi học thử hoàn thành
      if (
         session.isTrial &&
         data.status === SessionStatus.COMPLETED &&
         session.isModified("status")
      ) {
         const request = await TeachingRequest.findById(
            session.teachingRequestId
         );
         if (request) {
            // Tăng số buổi học thử đã hoàn thành
            request.trialSessionsCompleted =
               (request.trialSessionsCompleted || 0) + 1;

            // Nếu đã đủ 2 buổi thử, chuyển trạng thái request sang chờ quyết định
            if (request.trialSessionsCompleted >= 2) {
               request.status = TeachingRequestStatus.TRIAL_COMPLETED;
            }
            await request.save();
         }
      }

      await session.save();
      return session;
   }

   async delete(sessionId: string, userId: string) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      await this.checkParticipant(session.teachingRequestId.toString(), userId);

      if (session.status !== SessionStatus.SCHEDULED) {
         throw new BadRequestError("Only scheduled sessions can be deleted.");
      }

      await session.deleteOne();
   }
}

export default new SessionService();
