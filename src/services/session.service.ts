import Session from "../models/session.model";
import TeachingRequest from "../models/teachingRequest.model";
import Tutor from "../models/tutor.model";
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
import { getVietnamTime } from "../utils/date.util";

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

      // Prevent creating sessions in the past (use Vietnam time to be consistent)
      const now = getVietnamTime();
      if (newStart < now) {
         throw new BadRequestError("Cannot create a session in the past.");
      }

      // Tutor conflicts: find all teachingRequest ids assigned to this tutor
      const tutorRequests = await TeachingRequest.find({ tutorId: tutor._id })
         .select("_id")
         .lean();
      const tutorReqIds = tutorRequests.map((r) => r._id);

      const tutorConflict = await Session.findOne({
         teachingRequestId: { $in: tutorReqIds },
         isDeleted: { $ne: true }, // exclude soft-deleted
         status: { $nin: [SessionStatus.REJECTED, SessionStatus.CANCELLED] }, // exclude non-active sessions
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
            isDeleted: { $ne: true }, // exclude soft-deleted
            status: { $nin: [SessionStatus.REJECTED, SessionStatus.CANCELLED] }, // exclude non-active sessions
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
         createdBy: currentUser._id, // Lưu thông tin gia sư tạo session
         // studentConfirmation sẽ có default status: "PENDING"
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
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email", // Thêm email
                  },
               },
               {
                  path: "tutorId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email", // Thêm email
                  },
               },
            ],
         })
         .populate({
            path: "cancellation.cancelledBy",
            select: "_id name email avatarUrl",
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

   // --- NEW: Student confirms session participation
   async confirmParticipation(
      sessionId: string,
      studentUserId: string,
      decision: "ACCEPTED" | "REJECTED"
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      // Verify student is participant
      await this.checkParticipant(
         session.teachingRequestId.toString(),
         studentUserId
      );

      if (session.studentConfirmation?.status !== "PENDING") {
         throw new BadRequestError("Session participation already confirmed");
      }

      session.studentConfirmation = {
         status: decision,
         confirmedAt: new Date(),
      };

      if (decision === "REJECTED") {
         // Soft delete session
         session.isDeleted = true;
         session.deletedAt = new Date();
         session.deletedBy = new mongoose.Types.ObjectId(studentUserId);
         session.status = SessionStatus.REJECTED;
      } else {
         session.status = SessionStatus.CONFIRMED;
      }

      await session.save();
      return session;
   }

   // Confirm attendance after session (for both tutor and student)
   async confirmAttendance(sessionId: string, userId: string, userRole: Role) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      await this.checkParticipant(session.teachingRequestId.toString(), userId);

      // Cho phép điểm danh khi session đã được confirm
      if (session.status !== SessionStatus.CONFIRMED) {
         throw new BadRequestError(
            "Can only confirm attendance for sessions in CONFIRMED status"
         );
      }

      // Initialize attendanceConfirmation if not exists
      if (!session.attendanceConfirmation) {
         session.attendanceConfirmation = {
            tutor: {
               status: "PENDING",
            },
            student: {
               status: "PENDING",
            },
            isAttended: false,
         };
      }

      const now = new Date();

      // Update confirmation based on user role
      if (userRole === Role.TUTOR) {
         if (session.attendanceConfirmation.tutor.status !== "PENDING") {
            throw new BadRequestError("Tutor attendance already confirmed");
         }
         session.attendanceConfirmation.tutor.status = "ACCEPTED";
         session.attendanceConfirmation.tutor.decidedAt = now;
      } else if (userRole === Role.STUDENT) {
         if (session.attendanceConfirmation.student.status !== "PENDING") {
            throw new BadRequestError("Student attendance already confirmed");
         }
         session.attendanceConfirmation.student.status = "ACCEPTED";
         session.attendanceConfirmation.student.decidedAt = now;
      }

      // Check if both have responded
      const tutorResponded =
         session.attendanceConfirmation.tutor.status !== "PENDING";
      const studentResponded =
         session.attendanceConfirmation.student.status !== "PENDING";

      if (tutorResponded && studentResponded) {
         // Both have responded, finalize the session
         session.attendanceConfirmation.finalizedAt = now;

         const tutorAccepted =
            session.attendanceConfirmation.tutor.status === "ACCEPTED";
         const studentAccepted =
            session.attendanceConfirmation.student.status === "ACCEPTED";

         if (tutorAccepted && studentAccepted) {
            // Both confirmed attendance
            session.attendanceConfirmation.isAttended = true;
            session.status = SessionStatus.COMPLETED;
         } else {
            // At least one did not attend
            session.attendanceConfirmation.isAttended = false;
            session.status = SessionStatus.NOT_CONDUCTED;
         }

         // --- NEW: If this is a trial session and now completed, increment trial counter on TeachingRequest
         if (session.isTrial && session.status === SessionStatus.COMPLETED) {
            const request = await TeachingRequest.findById(
               session.teachingRequestId
            );
            if (request) {
               request.trialSessionsCompleted =
                  (request.trialSessionsCompleted || 0) + 1;
               if (request.trialSessionsCompleted >= 2) {
                  request.status = TeachingRequestStatus.TRIAL_COMPLETED;
               }
               await request.save();
            }
         }
      }

      await session.save();
      return session;
   }

   // Reject attendance after session
   async rejectAttendance(sessionId: string, userId: string, userRole: Role) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      await this.checkParticipant(session.teachingRequestId.toString(), userId);

      // Cho phép từ chối điểm danh chỉ khi session đã được confirm
      if (session.status !== SessionStatus.CONFIRMED) {
         throw new BadRequestError(
            "Can only reject attendance for sessions in CONFIRMED status"
         );
      }

      // Initialize attendanceConfirmation if not exists
      if (!session.attendanceConfirmation) {
         session.attendanceConfirmation = {
            tutor: {
               status: "PENDING",
            },
            student: {
               status: "PENDING",
            },
            isAttended: false,
         };
      }

      const now = new Date();

      // Update rejection based on user role
      if (userRole === Role.TUTOR) {
         if (session.attendanceConfirmation.tutor.status !== "PENDING") {
            throw new BadRequestError("Tutor attendance already decided");
         }
         session.attendanceConfirmation.tutor.status = "REJECTED";
         session.attendanceConfirmation.tutor.decidedAt = now;
      } else if (userRole === Role.STUDENT) {
         if (session.attendanceConfirmation.student.status !== "PENDING") {
            throw new BadRequestError("Student attendance already decided");
         }
         session.attendanceConfirmation.student.status = "REJECTED";
         session.attendanceConfirmation.student.decidedAt = now;
      }

      // Check if both have responded
      const tutorResponded =
         session.attendanceConfirmation.tutor.status !== "PENDING";
      const studentResponded =
         session.attendanceConfirmation.student.status !== "PENDING";

      if (tutorResponded && studentResponded) {
         // Both have responded, finalize the session
         session.attendanceConfirmation.finalizedAt = now;

         const tutorAccepted =
            session.attendanceConfirmation.tutor.status === "ACCEPTED";
         const studentAccepted =
            session.attendanceConfirmation.student.status === "ACCEPTED";

         if (tutorAccepted && studentAccepted) {
            // Both confirmed attendance
            session.attendanceConfirmation.isAttended = true;
            session.status = SessionStatus.COMPLETED;
         } else {
            // At least one did not attend
            session.attendanceConfirmation.isAttended = false;
            session.status = SessionStatus.NOT_CONDUCTED;
         }
      }

      await session.save();
      return session;
   }

   // Get sessions with filter for soft deleted
   async getAllSessions(includeDeleted: boolean = false) {
      const filter = includeDeleted ? {} : { isDeleted: { $ne: true } };
      return await Session.find(filter).populate({
         path: "teachingRequestId",
         select: "studentId tutorId subject level",
         populate: [
            {
               path: "studentId",
               select: "userId",
               populate: {
                  path: "userId",
                  select: "_id name avatarUrl email", // Thêm email
               },
            },
            {
               path: "tutorId",
               select: "userId",
               populate: {
                  path: "userId",
                  select: "_id name avatarUrl email", // Thêm email
               },
            },
         ],
      });
   }

   // Override existing methods to exclude soft deleted sessions
   async listByTeachingRequest(teachingRequestId: string, userId: string) {
      await this.checkParticipant(teachingRequestId, userId);
      const sessions = await Session.find({
         teachingRequestId,
         isDeleted: { $ne: true },
         status: { $ne: SessionStatus.CANCELLED },
      })
         .populate({
            path: "teachingRequestId",
            select: "studentId tutorId subject level",
            populate: [
               {
                  path: "studentId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email", // Thêm email
                  },
               },
               {
                  path: "tutorId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email", // Thêm email
                  },
               },
            ],
         })
         .populate({
            path: "cancellation.cancelledBy",
            select: "_id name email avatarUrl",
         })
         .sort({ startTime: "asc" });
      return sessions;
   }

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
         isDeleted: { $ne: true },
         status: { $ne: SessionStatus.CANCELLED },
      })
         .populate({
            path: "teachingRequestId",
            select: "studentId tutorId subject level",
            populate: [
               {
                  path: "studentId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email", // Thêm email
                  },
               },
               {
                  path: "tutorId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email", // Thêm email
                  },
               },
            ],
         })
         .populate({
            path: "cancellation.cancelledBy",
            select: "_id name email avatarUrl",
         })
         .sort({ startTime: "desc" });

      return sessions;
   }

   async update(
      sessionId: string,
      data: UpdateSessionBody,
      currentUser: IUser
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      // Prevent updates for sessions that have already started
      if (new Date() > session.startTime) {
         throw new BadRequestError(
            "Cannot update a session that has already started."
         );
      }

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

   // Cancel a confirmed session
   async cancel(sessionId: string, userId: string, reason: string) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      // Check if the user is a participant in the session
      await this.checkParticipant(session.teachingRequestId.toString(), userId);

      // Only confirmed sessions can be cancelled
      if (session.status !== SessionStatus.CONFIRMED) {
         throw new BadRequestError("Only confirmed sessions can be cancelled.");
      }

      // Check if cancellation is within the allowed time window (10 mins before start)
      const now = getVietnamTime();
      const tenMinutesBeforeStart = new Date(
         session.startTime.getTime() - 10 * 60 * 1000
      );

      if (now > tenMinutesBeforeStart) {
         throw new BadRequestError(
            "Session cannot be cancelled within 10 minutes of start time."
         );
      }

      // Update session status and cancellation details
      session.status = SessionStatus.CANCELLED;
      session.cancellation = {
         cancelledBy: new mongoose.Types.ObjectId(userId),
         reason: reason,
         cancelledAt: now,
      };

      await session.save();
      return session;
   }

   // Trả về session REJECTED và soft-deleted với populated user info; kiểm tra participant
   async getDeletedRejectedSessionById(sessionId: string, userId: string) {
      // Tìm session (cho phép isDeleted = true) và populate createdBy/deletedBy + teachingRequest -> student/tutor
      const session = await Session.findOne({
         _id: sessionId,
         status: SessionStatus.REJECTED,
         isDeleted: true,
      })
         .populate({
            path: "teachingRequestId",
            select: "studentId tutorId subject level",
            populate: [
               {
                  path: "studentId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email role",
                  },
               },
               {
                  path: "tutorId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email role",
                  },
               },
            ],
         })
         .populate({
            path: "createdBy",
            select: "_id name email role avatarUrl",
         })
         .populate({
            path: "deletedBy",
            select: "_id name email role avatarUrl",
         })
         .lean();

      if (!session)
         throw new NotFoundError(
            "Session not found or not a rejected soft-deleted session"
         );

      // ensure participant (student/tutor) can access — reuse checkParticipant
      await this.checkParticipant(
         (session.teachingRequestId as any)._id.toString(),
         userId.toString()
      );

      return session;
   }

   // Trả về danh sách các session REJECTED và soft-deleted cho một user (student hoặc tutor)
   async listDeletedRejectedForUser(userId: string) {
      // tìm tutor/student profile
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      const student = await Student.findOne({ userId }).select("_id").lean();

      const requestFilters: any[] = [];
      if (tutor) requestFilters.push({ tutorId: tutor._id });
      if (student) requestFilters.push({ studentId: student._id });

      if (requestFilters.length === 0) return [];

      const requests = await TeachingRequest.find({ $or: requestFilters })
         .select("_id")
         .lean();
      const requestIds = requests.map((r) => r._id);
      if (requestIds.length === 0) return [];

      const sessions = await Session.find({
         teachingRequestId: { $in: requestIds },
         status: SessionStatus.REJECTED,
         isDeleted: true,
      })
         .populate({
            path: "teachingRequestId",
            select: "studentId tutorId subject level",
            populate: [
               {
                  path: "studentId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name email avatarUrl role",
                  },
               },
               {
                  path: "tutorId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name email avatarUrl role",
                  },
               },
            ],
         })
         .populate({
            path: "createdBy",
            select: "_id name email role avatarUrl",
         })
         .populate({
            path: "deletedBy",
            select: "_id name email role avatarUrl",
         })
         .sort({ startTime: -1 })
         .lean();

      return sessions;
   }

   // NEW: Trả về danh sách các session CANCELLED cho một user (student hoặc tutor)
   async listCancelledForUser(userId: string) {
      // tìm tutor/student profile
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      const student = await Student.findOne({ userId }).select("_id").lean();

      const requestFilters: any[] = [];
      if (tutor) requestFilters.push({ tutorId: tutor._id });
      if (student) requestFilters.push({ studentId: student._id });

      if (requestFilters.length === 0) return [];

      const requests = await TeachingRequest.find({ $or: requestFilters })
         .select("_id")
         .lean();
      const requestIds = requests.map((r) => r._id);
      if (requestIds.length === 0) return [];

      const sessions = await Session.find({
         teachingRequestId: { $in: requestIds },
         status: SessionStatus.CANCELLED,
      })
         .populate({
            path: "teachingRequestId",
            select: "studentId tutorId subject level",
            populate: [
               {
                  path: "studentId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name email avatarUrl role",
                  },
               },
               {
                  path: "tutorId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name email avatarUrl role",
                  },
               },
            ],
         })
         .populate({
            path: "createdBy", // Who created the session
            select: "_id name email role avatarUrl",
         })
         .populate({
            path: "cancellation.cancelledBy", // Who cancelled the session
            select: "_id name email role avatarUrl",
         })
         .sort({ "cancellation.cancelledAt": -1 })
         .lean();

      return sessions;
   }
}

export default new SessionService();
