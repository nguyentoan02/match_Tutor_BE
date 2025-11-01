import Session from "../models/session.model";
import TeachingRequest from "../models/teachingRequest.model";
import Tutor from "../models/tutor.model";
import Student from "../models/student.model";
import LearningCommitment from "../models/learningCommitment.model";
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
import moment from "moment-timezone";

class SessionService {
   private TUTOR_CHECKIN_GRACE_MINUTES = 15;
   private STUDENT_CHECKIN_GRACE_MINUTES = 30;

   private appendLog(
      session: any,
      entry: {
         userRole: "TUTOR" | "STUDENT" | "SYSTEM";
         action: string;
         note?: string;
      }
   ) {
      if (!session.attendanceLogs) session.attendanceLogs = [];
      session.attendanceLogs.push({ ...entry, createdAt: getVietnamTime() });
   }

   // NEW: Helper method to handle extending commitment endDate based on absent sessions
   private async extendCommitmentForAbsences(commitmentId: string) {
      const commitment = await LearningCommitment.findById(commitmentId);
      if (!commitment) return;

      // Increment absent sessions count
      commitment.absentSessions = (commitment.absentSessions || 0) + 1;

      // Calculate new extended weeks
      const newExtendedWeeks = Math.ceil(commitment.absentSessions / 2);
      const oldExtendedWeeks = commitment.extendedWeeks || 0;

      // If new extended weeks > old, extend endDate by the difference
      if (newExtendedWeeks > oldExtendedWeeks) {
         const weeksToAdd = newExtendedWeeks - oldExtendedWeeks;
         const endDateMoment = moment(commitment.endDate).tz(
            "Asia/Ho_Chi_Minh"
         );
         endDateMoment.add(weeksToAdd, "weeks");
         commitment.endDate = endDateMoment.toDate();
         commitment.extendedWeeks = newExtendedWeeks;
      }

      await commitment.save();
   }

   private async autoFinalizeAttendanceIfDue(session: any) {
      const now = getVietnamTime();
      const end = session.endTime as Date;

      // Ensure deadlines exist
      const tutorDeadline =
         session.attendanceWindow?.tutorDeadline ||
         new Date(end.getTime() + this.TUTOR_CHECKIN_GRACE_MINUTES * 60 * 1000);
      const studentDeadline =
         session.attendanceWindow?.studentDeadline ||
         new Date(
            end.getTime() + this.STUDENT_CHECKIN_GRACE_MINUTES * 60 * 1000
         );
      session.attendanceWindow = { tutorDeadline, studentDeadline };

      const tutorStatus =
         session.attendanceConfirmation?.tutor?.status || "PENDING";
      const studentStatus =
         session.attendanceConfirmation?.student?.status || "PENDING";

      // If already finalized or completed/disputed, skip
      if (
         [
            SessionStatus.COMPLETED,
            SessionStatus.CANCELLED,
            SessionStatus.DISPUTED,
         ].includes(session.status)
      )
         return session;

      // Tutor missed
      if (tutorStatus === "PENDING" && now > tutorDeadline) {
         // Tutor absent auto
         session.attendanceConfirmation = session.attendanceConfirmation || {
            tutor: { status: "PENDING" },
            student: { status: "PENDING" },
            isAttended: false,
         };
         session.attendanceConfirmation.tutor.status = "REJECTED";
         session.attendanceConfirmation.tutor.decidedAt = now;
         session.absence = session.absence || {};
         session.absence.tutorAbsent = true;
         session.absence.decidedAt = now;
         this.appendLog(session, {
            userRole: "SYSTEM",
            action: "ABSENT_AUTO",
            note: "Tutor missed check-in window",
         });
         session.status = SessionStatus.NOT_CONDUCTED;
         // NEW: Extend commitment for absences
         await this.extendCommitmentForAbsences(
            session.learningCommitmentId.toString()
         );
      }

      // If tutor checked in but student missed
      const tutorAccepted =
         (session.attendanceConfirmation?.tutor?.status || "PENDING") ===
         "ACCEPTED";
      if (
         tutorAccepted &&
         studentStatus === "PENDING" &&
         now > studentDeadline
      ) {
         session.attendanceConfirmation.student.status = "REJECTED";
         session.attendanceConfirmation.student.decidedAt = now;
         session.absence = session.absence || {};
         session.absence.studentAbsent = true;
         session.absence.decidedAt = now;
         this.appendLog(session, {
            userRole: "SYSTEM",
            action: "ABSENT_AUTO",
            note: "Student missed check-in window",
         });
         session.status = SessionStatus.NOT_CONDUCTED;
         // NEW: Extend commitment for absences
         await this.extendCommitmentForAbsences(
            session.learningCommitmentId.toString()
         );
      }

      return session;
   }
   // Legacy: participant check via teaching request (kept for existing endpoints)
   private async checkParticipant(teachingRequestId: string, userId: string) {
      const request = await TeachingRequest.findById(teachingRequestId)
         .populate({
            path: "studentId",
            select: "userId",
            populate: { path: "userId", select: "_id" },
         })
         .populate({
            path: "tutorId",
            select: "userId",
            populate: { path: "userId", select: "_id" },
         });

      if (!request) {
         throw new NotFoundError("Teaching request not found");
      }

      const userIdStr = userId.toString();
      const studentUserId = (request.studentId as any)?.userId?._id?.toString();
      const tutorUserId = (request.tutorId as any)?.userId?._id?.toString();

      if (userIdStr !== studentUserId && userIdStr !== tutorUserId) {
         throw new ForbiddenError(
            "You are not a participant of this teaching request."
         );
      }
      return request;
   }
   private async checkParticipantByCommitment(
      learningCommitmentId: string,
      userId: string
   ) {
      const commitment = await LearningCommitment.findById(learningCommitmentId)
         .populate({
            path: "student",
            select: "userId",
            populate: { path: "userId", select: "_id" },
         })
         .populate({
            path: "tutor",
            select: "userId",
            populate: { path: "userId", select: "_id" },
         });

      if (!commitment) {
         throw new NotFoundError("Learning commitment not found");
      }

      const userIdStr = userId.toString();
      const studentUserId = (
         commitment as any
      )?.student?.userId?._id?.toString();
      const tutorUserId = (commitment as any)?.tutor?.userId?._id?.toString();

      if (userIdStr !== studentUserId && userIdStr !== tutorUserId) {
         throw new ForbiddenError(
            "You are not a participant of this learning commitment."
         );
      }
      return commitment;
   }

   // Create session based on active learning commitment
   async create(data: CreateSessionBody, currentUser: IUser) {
      const commitment = await LearningCommitment.findById(
         (data as any).learningCommitmentId
      );
      if (!commitment) throw new NotFoundError("Learning commitment not found");

      // Only tutor of this commitment can create sessions
      if (currentUser.role !== Role.TUTOR) {
         throw new ForbiddenError("Only the tutor can create sessions.");
      }

      const tutor = await Tutor.findOne({ userId: currentUser._id });
      if (!tutor || String(commitment.tutor) !== String(tutor._id)) {
         throw new ForbiddenError(
            "You are not the designated tutor for this learning commitment."
         );
      }

      // Commitment must be active
      if (commitment.status !== "active") {
         throw new BadRequestError(
            "Sessions can only be created for active learning commitments."
         );
      }

      // Must be fully paid before creating sessions
      if ((commitment.studentPaidAmount || 0) < (commitment.totalAmount || 0)) {
         throw new BadRequestError(
            "Cannot create session: learning commitment is not fully paid."
         );
      }

      // Parse times
      const newStart = new Date((data as any).startTime);
      const newEnd = new Date((data as any).endTime);
      if (!(newStart < newEnd)) {
         throw new BadRequestError("startTime must be before endTime");
      }

      // Must be within commitment window (compare by Vietnam timezone, inclusive by day)
      const vnStart = moment(newStart).tz("Asia/Ho_Chi_Minh");
      const vnEnd = moment(newEnd).tz("Asia/Ho_Chi_Minh");
      const commitmentStartVN = moment(commitment.startDate)
         .tz("Asia/Ho_Chi_Minh")
         .startOf("day");
      const commitmentEndVN = moment(commitment.endDate)
         .tz("Asia/Ho_Chi_Minh")
         .endOf("day");

      if (
         vnStart.isBefore(commitmentStartVN) ||
         vnEnd.isAfter(commitmentEndVN)
      ) {
         throw new BadRequestError(
            "Session time must be within the learning commitment period."
         );
      }

      // Prevent creating sessions in the past (use Vietnam time to be consistent)
      const now = getVietnamTime();
      if (newStart < now) {
         throw new BadRequestError("Cannot create a session in the past.");
      }

      // Enforce session count within commitment
      // const scheduledCount = await Session.countDocuments({
      //    learningCommitmentId: commitment._id,
      //    isDeleted: { $ne: true },
      //    status: { $nin: [SessionStatus.REJECTED, SessionStatus.CANCELLED] },
      // });
      const completed = commitment.completedSessions || 0;
      const total = commitment.totalSessions;
      // if (scheduledCount + completed >= total) {
      //    throw new BadRequestError(
      //       "Number of sessions exceeds the commitment's total sessions."
      //    );
      // }
      if (completed >= total) {
         throw new BadRequestError(
            "Number of sessions exceeds the commitment's total sessions."
         );
      }

      // Conflict checks for tutor and student across their commitments
      const tutorCommitments = await LearningCommitment.find({
         tutor: commitment.tutor,
         status: { $in: ["active", "pending_agreement", "in_dispute"] },
      })
         .select("_id")
         .lean();
      const tutorCommitmentIds = tutorCommitments.map((c) => c._id);

      const tutorConflict = await Session.findOne({
         learningCommitmentId: { $in: tutorCommitmentIds },
         isDeleted: { $ne: true },
         status: { $nin: [SessionStatus.REJECTED, SessionStatus.CANCELLED] },
         $or: [{ startTime: { $lt: newEnd }, endTime: { $gt: newStart } }],
      }).lean();
      if (tutorConflict) {
         throw new BadRequestError(
            "You have a conflicting session at this time (tutor)."
         );
      }

      const studentCommitments = await LearningCommitment.find({
         student: commitment.student,
         status: { $in: ["active", "pending_agreement", "in_dispute"] },
      })
         .select("_id")
         .lean();
      const studentCommitmentIds = studentCommitments.map((c) => c._id);
      const studentConflict = await Session.findOne({
         learningCommitmentId: { $in: studentCommitmentIds },
         isDeleted: { $ne: true },
         status: { $nin: [SessionStatus.REJECTED, SessionStatus.CANCELLED] },
         $or: [{ startTime: { $lt: newEnd }, endTime: { $gt: newStart } }],
      }).lean();
      if (studentConflict) {
         throw new BadRequestError(
            "Student has a conflicting session at this time."
         );
      }

      const newSession = await Session.create({
         learningCommitmentId: commitment._id,
         startTime: newStart,
         endTime: newEnd,
         isTrial: (data as any).isTrial || false,
         createdBy: currentUser._id,
         attendanceWindow: {
            tutorDeadline: new Date(newEnd.getTime() + 15 * 60 * 1000),
            studentDeadline: new Date(newEnd.getTime() + 30 * 60 * 1000),
         },
      });

      return newSession;
   }

   async getById(sessionId: string, userId: string) {
      const session = await Session.findById(sessionId)
         .populate({
            path: "learningCommitmentId",
            select: "student tutor",
            populate: [
               {
                  path: "student",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email",
                  },
               },
               {
                  path: "tutor",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email",
                  },
               },
            ],
         })
         .populate({
            path: "cancellation.cancelledBy",
            select: "_id name email avatarUrl",
         });

      if (!session) throw new NotFoundError("Session not found");

      // Ensure userId is participant of the commitment
      await this.checkParticipantByCommitment(
         (session.learningCommitmentId as any)._id.toString(),
         userId.toString()
      );
      // Auto-finalize based on time windows when viewing
      await this.autoFinalizeAttendanceIfDue(session as any);
      await session.save();
      return session.toObject();
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
      await this.checkParticipantByCommitment(
         session.learningCommitmentId.toString(),
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

      await this.checkParticipantByCommitment(
         session.learningCommitmentId.toString(),
         userId
      );

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

      // Ensure deadlines
      const tutorDeadline =
         session.attendanceWindow?.tutorDeadline ||
         new Date(
            session.endTime.getTime() +
               this.TUTOR_CHECKIN_GRACE_MINUTES * 60 * 1000
         );
      const studentDeadline =
         session.attendanceWindow?.studentDeadline ||
         new Date(
            session.endTime.getTime() +
               this.STUDENT_CHECKIN_GRACE_MINUTES * 60 * 1000
         );
      session.attendanceWindow = { tutorDeadline, studentDeadline };

      // Enforce order: student can only confirm after tutor
      if (
         userRole === Role.STUDENT &&
         session.attendanceConfirmation.tutor.status !== "ACCEPTED"
      ) {
         throw new BadRequestError(
            "Student can confirm only after tutor has checked in."
         );
      }

      // Time window enforcement
      if (userRole === Role.TUTOR && now > tutorDeadline) {
         await this.autoFinalizeAttendanceIfDue(session);
         await session.save();
         throw new BadRequestError("Tutor check-in window has passed");
      }
      if (userRole === Role.STUDENT && now > studentDeadline) {
         await this.autoFinalizeAttendanceIfDue(session);
         await session.save();
         throw new BadRequestError("Student check-in window has passed");
      }

      // Update confirmation based on user role
      if (userRole === Role.TUTOR) {
         if (session.attendanceConfirmation.tutor.status !== "PENDING") {
            throw new BadRequestError("Tutor attendance already confirmed");
         }
         session.attendanceConfirmation.tutor.status = "ACCEPTED";
         session.attendanceConfirmation.tutor.decidedAt = now;
         this.appendLog(session, { userRole: "TUTOR", action: "CHECKED_IN" });
      } else if (userRole === Role.STUDENT) {
         if (session.attendanceConfirmation.student.status !== "PENDING") {
            throw new BadRequestError("Student attendance already confirmed");
         }
         session.attendanceConfirmation.student.status = "ACCEPTED";
         session.attendanceConfirmation.student.decidedAt = now;
         this.appendLog(session, { userRole: "STUDENT", action: "CHECKED_IN" });
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
            // Increment completed sessions on the related learning commitment
            const commitment = await LearningCommitment.findById(
               session.learningCommitmentId
            );
            if (commitment) {
               commitment.completedSessions =
                  (commitment.completedSessions || 0) + 1;
               // Auto-complete commitment if reached totalSessions
               if (
                  commitment.completedSessions >= commitment.totalSessions &&
                  commitment.status === "active"
               ) {
                  commitment.status = "completed" as any;
               }
               await commitment.save();
            }
         } else {
            // At least one did not attend
            session.attendanceConfirmation.isAttended = false;
            session.status = SessionStatus.NOT_CONDUCTED;
            // NEW: Extend commitment for absences
            await this.extendCommitmentForAbsences(
               session.learningCommitmentId.toString()
            );
         }

         // --- NEW: If this is a trial session and now completed, increment trial counter on TeachingRequest
         if (session.isTrial && session.status === SessionStatus.COMPLETED) {
            // No-op or future logic for trial sessions under commitments
         }
      }

      await session.save();
      return session;
   }

   // Reject attendance after session
   async rejectAttendance(
      sessionId: string,
      userId: string,
      userRole: Role,
      payload?: { reason?: string; evidenceUrls?: string[] }
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      await this.checkParticipantByCommitment(
         session.learningCommitmentId.toString(),
         userId
      );

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

      // Ensure deadlines
      const tutorDeadline =
         session.attendanceWindow?.tutorDeadline ||
         new Date(
            session.endTime.getTime() +
               this.TUTOR_CHECKIN_GRACE_MINUTES * 60 * 1000
         );
      const studentDeadline =
         session.attendanceWindow?.studentDeadline ||
         new Date(
            session.endTime.getTime() +
               this.STUDENT_CHECKIN_GRACE_MINUTES * 60 * 1000
         );
      session.attendanceWindow = { tutorDeadline, studentDeadline };

      // Update rejection based on user role
      if (userRole === Role.TUTOR) {
         if (session.attendanceConfirmation.tutor.status !== "PENDING") {
            throw new BadRequestError("Tutor attendance already decided");
         }
         session.attendanceConfirmation.tutor.status = "REJECTED";
         session.attendanceConfirmation.tutor.decidedAt = now;
         // Tutor marking absent means session is absent immediately
         session.absence = session.absence || {};
         session.absence.tutorAbsent = true;
         session.absence.decidedAt = now;
         session.status = SessionStatus.NOT_CONDUCTED;
         // NEW: Extend commitment for absences
         await this.extendCommitmentForAbsences(
            session.learningCommitmentId.toString()
         );
         this.appendLog(session, {
            userRole: "TUTOR",
            action: "ABSENT_MANUAL",
            note: payload?.reason,
         });
      } else if (userRole === Role.STUDENT) {
         if (session.attendanceConfirmation.student.status !== "PENDING") {
            throw new BadRequestError("Student attendance already decided");
         }
         // If tutor has accepted and student rejects -> open dispute (evidence required)
         const tutorAccepted =
            session.attendanceConfirmation.tutor.status === "ACCEPTED";
         if (tutorAccepted) {
            if (
               !payload?.evidenceUrls ||
               payload.evidenceUrls.length === 0 ||
               !payload?.reason
            ) {
               throw new BadRequestError(
                  "Evidence and reason are required to dispute after tutor check-in"
               );
            }
            session.attendanceConfirmation.student.status = "REJECTED";
            session.attendanceConfirmation.student.decidedAt = now;
            session.dispute = {
               status: "OPEN",
               openedBy: new mongoose.Types.ObjectId(userId),
               reason: payload.reason,
               evidenceUrls: payload.evidenceUrls,
               openedAt: now,
            } as any;
            session.status = SessionStatus.DISPUTED;
            this.appendLog(session, {
               userRole: "STUDENT",
               action: "DISPUTE_OPENED",
               note: payload.reason,
            });
         } else {
            // Student rejects before tutor check-in -> treat as student absent for now
            session.attendanceConfirmation.student.status = "REJECTED";
            session.attendanceConfirmation.student.decidedAt = now;
            session.absence = session.absence || {};
            session.absence.studentAbsent = true;
            session.absence.decidedAt = now;
            session.status = SessionStatus.NOT_CONDUCTED;
            // NEW: Extend commitment for absences
            await this.extendCommitmentForAbsences(
               session.learningCommitmentId.toString()
            );
            this.appendLog(session, {
               userRole: "STUDENT",
               action: "ABSENT_MANUAL",
               note: payload?.reason,
            });
         }
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
            // Keep DISPUTED if dispute already opened
            if (session.status !== SessionStatus.DISPUTED) {
               session.status = SessionStatus.NOT_CONDUCTED;
            }
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

   // List sessions by learning commitment for a participant
   async listByLearningCommitment(
      learningCommitmentId: string,
      userId: string
   ) {
      await this.checkParticipantByCommitment(learningCommitmentId, userId);
      const sessions = await Session.find({
         learningCommitmentId,
         isDeleted: { $ne: true },
         status: { $ne: SessionStatus.CANCELLED },
      })
         .populate({
            path: "learningCommitmentId",
            select: "student tutor",
            populate: [
               {
                  path: "student",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email",
                  },
               },
               {
                  path: "tutor",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email",
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

   // ...existing code...
   async listForUser(userId: string) {
      // find tutor and student records (either can be present)
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      const student = await Student.findOne({ userId }).select("_id").lean();

      const requestFilters: any[] = [];
      if (tutor) requestFilters.push({ tutorId: tutor._id });
      if (student) requestFilters.push({ studentId: student._id });

      // Collect teachingRequest ids (if any)
      let requestIds: any[] = [];
      if (requestFilters.length > 0) {
         const requests = await TeachingRequest.find({ $or: requestFilters })
            .select("_id")
            .lean();
         requestIds = requests.map((r) => r._id);
      }

      // Collect learningCommitment ids for the user (if any)
      const commitmentFilters: any[] = [];
      if (tutor) commitmentFilters.push({ tutor: tutor._id });
      if (student) commitmentFilters.push({ student: student._id });

      let commitmentIds: any[] = [];
      if (commitmentFilters.length > 0) {
         const commitments = await LearningCommitment.find({
            $or: commitmentFilters,
         })
            .select("_id")
            .lean();
         commitmentIds = commitments.map((c) => c._id);
      }

      // If no related requests or commitments -> empty
      if (requestIds.length === 0 && commitmentIds.length === 0) return [];

      // Return sessions for those teaching requests OR those commitments
      const sessions = await Session.find({
         $or: [
            { teachingRequestId: { $in: requestIds } },
            { learningCommitmentId: { $in: commitmentIds } },
         ],
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
            path: "learningCommitmentId",
            select: "student tutor",
            populate: [
               {
                  path: "student",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email",
                  },
               },
               {
                  path: "tutor",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email",
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
   // ...existing code...

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
      // NEW: Prevent updates for completed sessions
      if (session.status === SessionStatus.COMPLETED) {
         throw new BadRequestError(
            "Cannot update a session that has already been completed."
         );
      }
      await this.checkParticipant(
         (session.learningCommitmentId as any)!.toString(),
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

      await this.checkParticipant(
         (session.learningCommitmentId as any)!.toString(),
         userId
      );

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
      if (session.learningCommitmentId) {
         await this.checkParticipantByCommitment(
            (session.learningCommitmentId as any).toString(),
            userId
         );
      } else if (session.teachingRequestId) {
         await this.checkParticipant(
            (session.teachingRequestId as any).toString(),
            userId
         );
      } else {
         throw new BadRequestError("Session is missing participant linkage.");
      }

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
      // Lấy các learning commitments của user (đang active hoặc đã từng có)
      const commitments = await LearningCommitment.find({
         $or: [{ tutor: tutor?._id }, { student: student?._id }],
      })
         .select("_id")
         .lean();
      const commitmentIds = commitments.map((c) => c._id);
      const sessions = await Session.find({
         status: SessionStatus.REJECTED,
         isDeleted: true,
         $or: [
            { teachingRequestId: { $in: requestIds } },
            { learningCommitmentId: { $in: commitmentIds } },
         ],
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

      const commitments = await LearningCommitment.find({
         $or: [{ tutor: tutor?._id }, { student: student?._id }],
      })
         .select("_id")
         .lean();
      const commitmentIds = commitments.map((c) => c._id);

      const sessions = await Session.find({
         status: SessionStatus.CANCELLED,
         $or: [{ learningCommitmentId: { $in: commitmentIds } }],
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
