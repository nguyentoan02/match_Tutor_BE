import Session from "../models/session.model";
import Tutor from "../models/tutor.model";
import Student from "../models/student.model";
import LearningCommitment from "../models/learningCommitment.model";
import {
   CreateSessionBody,
   UpdateSessionBody,
} from "../schemas/session.schema";
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

   private async extendCommitmentForAbsences(commitmentId: string) {
      const commitment = await LearningCommitment.findById(commitmentId);
      if (!commitment) return;

      commitment.absentSessions = (commitment.absentSessions || 0) + 1;

      const newExtendedWeeks = Math.ceil(commitment.absentSessions / 2);
      const oldExtendedWeeks = commitment.extendedWeeks || 0;

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

   private async autoFinalizeStudentConfirmationIfDue(session: any) {
      const now = getVietnamTime();
      const start = session.startTime as Date;

      // 15 phút trước thời gian bắt đầu buổi học
      const studentConfirmationDeadline = new Date(
         start.getTime() - 15 * 60 * 1000
      );

      // Chỉ xử lý nếu buổi học chưa bắt đầu và học sinh chưa xác nhận
      if (
         session.status === SessionStatus.SCHEDULED &&
         session.studentConfirmation?.status === "PENDING" &&
         now > studentConfirmationDeadline
      ) {
         session.studentConfirmation = {
            status: "REJECTED",
            confirmedAt: now,
         };
         session.isDeleted = true;
         session.deletedAt = now;
         session.status = SessionStatus.REJECTED;
         this.appendLog(session, {
            userRole: "SYSTEM",
            action: "ABSENT_AUTO",
            note: "Session cancelled: Student did not confirm 15 minutes before start time",
         });
         await session.save();
      }
   }

   private async autoFinalizeAttendanceIfDue(session: any) {
      const now = getVietnamTime();
      const end = session.endTime as Date;

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

      if (
         [
            SessionStatus.COMPLETED,
            SessionStatus.CANCELLED,
            SessionStatus.DISPUTED,
         ].includes(session.status)
      )
         return session;

      // Tutor miss check-in deadline
      if (tutorStatus === "PENDING" && now > tutorDeadline) {
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
         session.absence.reason = "Tutor missed check-in window"; // Thêm lý do
         session.absence.evidenceUrls = []; // Empty array cho auto absence
         this.appendLog(session, {
            userRole: "SYSTEM",
            action: "ABSENT_AUTO",
            note: "Tutor missed check-in window",
         });
         session.status = SessionStatus.NOT_CONDUCTED;
         await this.extendCommitmentForAbsences(
            session.learningCommitmentId._id.toString()
         );
      }

      // Student miss check-in deadline (after tutor accepted)
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
         session.absence.reason = "Student missed check-in window"; // ✅ Thêm lý do
         session.absence.evidenceUrls = []; //  Empty array cho auto absence
         this.appendLog(session, {
            userRole: "SYSTEM",
            action: "ABSENT_AUTO",
            note: "Student missed check-in window",
         });
         session.status = SessionStatus.NOT_CONDUCTED;
         await this.extendCommitmentForAbsences(
            session.learningCommitmentId._id.toString()
         );
      }

      return session;
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

   async create(data: CreateSessionBody, currentUser: IUser) {
      const commitment = await LearningCommitment.findById(
         (data as any).learningCommitmentId
      );
      if (!commitment) throw new NotFoundError("Learning commitment not found");

      if (currentUser.role !== Role.TUTOR) {
         throw new ForbiddenError("Only the tutor can create sessions.");
      }

      const tutor = await Tutor.findOne({ userId: currentUser._id });
      if (!tutor || String(commitment.tutor) !== String(tutor._id)) {
         throw new ForbiddenError(
            "You are not the designated tutor for this learning commitment."
         );
      }

      if (commitment.status !== "active") {
         throw new BadRequestError(
            "Sessions can only be created for active learning commitments."
         );
      }

      if ((commitment.studentPaidAmount || 0) < (commitment.totalAmount || 0)) {
         throw new BadRequestError(
            "Cannot create session: learning commitment is not fully paid."
         );
      }

      const newStart = new Date((data as any).startTime);
      const newEnd = new Date((data as any).endTime);
      if (!(newStart < newEnd)) {
         throw new BadRequestError("startTime must be before endTime");
      }

      // Kiểm tra session phải nằm trong cùng một ngày (Vietnam timezone)
      const vnStart = moment(newStart).tz("Asia/Ho_Chi_Minh");
      const vnEnd = moment(newEnd).tz("Asia/Ho_Chi_Minh");

      if (!vnStart.isSame(vnEnd, "day")) {
         throw new BadRequestError(
            "Session must be scheduled within the same day. Start time and end time cannot span across different dates."
         );
      }

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

      const now = getVietnamTime();
      if (newStart < now) {
         throw new BadRequestError("Cannot create a session in the past.");
      }

      const completed = commitment.completedSessions || 0;
      const total = commitment.totalSessions;
      if (completed >= total) {
         throw new BadRequestError(
            "Number of sessions exceeds the commitment's total sessions."
         );
      }

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
         location: (data as any).location,
         notes: (data as any).notes,
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
            select: "student tutor teachingRequest",
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
               {
                  path: "teachingRequest",
                  select: "subject level status", // Thêm level và status
               },
            ],
         })
         .populate({
            path: "cancellation.cancelledBy",
            select: "_id name email avatarUrl",
         });

      if (!session) throw new NotFoundError("Session not found");

      await this.checkParticipantByCommitment(
         (session.learningCommitmentId as any)._id.toString(),
         userId.toString()
      );
      await this.autoFinalizeStudentConfirmationIfDue(session as any);
      await this.autoFinalizeAttendanceIfDue(session as any);
      await session.save();
      return session.toObject();
   }

   async confirmParticipation(
      sessionId: string,
      studentUserId: string,
      decision: "ACCEPTED" | "REJECTED"
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

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

   async confirmAttendance(sessionId: string, userId: string, userRole: Role) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      await this.checkParticipantByCommitment(
         session.learningCommitmentId.toString(),
         userId
      );

      if (session.status !== SessionStatus.CONFIRMED) {
         throw new BadRequestError(
            "Can only confirm attendance for sessions in CONFIRMED status"
         );
      }

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

      if (
         userRole === Role.STUDENT &&
         session.attendanceConfirmation.tutor.status !== "ACCEPTED"
      ) {
         throw new BadRequestError(
            "Student can confirm only after tutor has checked in."
         );
      }

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

      const tutorResponded =
         session.attendanceConfirmation.tutor.status !== "PENDING";
      const studentResponded =
         session.attendanceConfirmation.student.status !== "PENDING";

      if (tutorResponded && studentResponded) {
         session.attendanceConfirmation.finalizedAt = now;

         const tutorAccepted =
            session.attendanceConfirmation.tutor.status === "ACCEPTED";
         const studentAccepted =
            session.attendanceConfirmation.student.status === "ACCEPTED";

         if (tutorAccepted && studentAccepted) {
            session.attendanceConfirmation.isAttended = true;
            session.status = SessionStatus.COMPLETED;
            const commitment = await LearningCommitment.findById(
               session.learningCommitmentId
            );
            if (commitment) {
               commitment.completedSessions =
                  (commitment.completedSessions || 0) + 1;
               if (
                  commitment.completedSessions >= commitment.totalSessions &&
                  commitment.status === "active"
               ) {
                  commitment.status = "completed" as any;
               }
               await commitment.save();
            }
         } else {
            session.attendanceConfirmation.isAttended = false;
            session.status = SessionStatus.NOT_CONDUCTED;
            await this.extendCommitmentForAbsences(
               session.learningCommitmentId._id.toString()
            );
         }
      }

      await session.save();
      return session;
   }

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

      if (session.status !== SessionStatus.CONFIRMED) {
         throw new BadRequestError(
            "Can only reject attendance for sessions in CONFIRMED status"
         );
      }

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

      if (userRole === Role.TUTOR) {
         if (session.attendanceConfirmation.tutor.status !== "PENDING") {
            throw new BadRequestError("Tutor attendance already decided");
         }
         session.attendanceConfirmation.tutor.status = "REJECTED";
         session.attendanceConfirmation.tutor.decidedAt = now;
         session.absence = session.absence || {};
         session.absence.tutorAbsent = true;
         session.absence.decidedAt = now;
         session.absence.reason = payload?.reason;
         session.absence.evidenceUrls = payload?.evidenceUrls || [];
         session.status = SessionStatus.NOT_CONDUCTED;
         await this.extendCommitmentForAbsences(
            session.learningCommitmentId._id.toString()
         );
         this.appendLog(session, {
            userRole: "TUTOR",
            action: "ABSENT_MANUAL",
            note: payload?.reason,
         });
      } else if (userRole === Role.STUDENT) {
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
            session.attendanceConfirmation.student.status = "REJECTED";
            session.attendanceConfirmation.student.decidedAt = now;
            session.absence = session.absence || {};
            session.absence.studentAbsent = true;
            session.absence.decidedAt = now;
            session.absence.reason = payload?.reason;
            session.absence.evidenceUrls = payload?.evidenceUrls || [];
            session.status = SessionStatus.NOT_CONDUCTED;
            await this.extendCommitmentForAbsences(
               session.learningCommitmentId._id.toString()
            );
            this.appendLog(session, {
               userRole: "STUDENT",
               action: "ABSENT_MANUAL",
               note: payload?.reason,
            });
         }
      }

      const tutorResponded =
         session.attendanceConfirmation.tutor.status !== "PENDING";
      const studentResponded =
         session.attendanceConfirmation.student.status !== "PENDING";

      if (tutorResponded && studentResponded) {
         session.attendanceConfirmation.finalizedAt = now;

         const tutorAccepted =
            session.attendanceConfirmation.tutor.status === "ACCEPTED";
         const studentAccepted =
            session.attendanceConfirmation.student.status === "ACCEPTED";

         if (tutorAccepted && studentAccepted) {
            session.attendanceConfirmation.isAttended = true;
            session.status = SessionStatus.COMPLETED;
         } else {
            session.attendanceConfirmation.isAttended = false;
            if (session.status !== SessionStatus.DISPUTED) {
               session.status = SessionStatus.NOT_CONDUCTED;
            }
         }
      }

      await session.save();
      return session;
   }

   // lấy danh sách list session
   async listForUser(userId: string) {
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      const student = await Student.findOne({ userId }).select("_id").lean();

      const commitmentFilters: any[] = [];
      if (tutor) commitmentFilters.push({ tutor: tutor._id });
      if (student) commitmentFilters.push({ student: student._id });

      if (commitmentFilters.length === 0) return [];

      const commitments = await LearningCommitment.find({
         $or: commitmentFilters,
      })
         .select("_id")
         .lean();
      const commitmentIds = commitments.map((c) => c._id);

      let sessions = await Session.find({
         learningCommitmentId: { $in: commitmentIds },
         isDeleted: { $ne: true },
         status: { $ne: SessionStatus.CANCELLED },
      })
         .populate({
            path: "learningCommitmentId",
            select: "student tutor teachingRequest",
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
               {
                  path: "teachingRequest",
                  select: "subject",
               },
            ],
         })
         .populate({
            path: "cancellation.cancelledBy",
            select: "_id name email avatarUrl",
         })
         .sort({ startTime: "desc" });

      // Kiểm tra và cập nhật trạng thái các buổi học chưa xác nhận và attendance
      for (const session of sessions) {
         await this.autoFinalizeStudentConfirmationIfDue(session as any);
         await this.autoFinalizeAttendanceIfDue(session as any);
      }

      await Promise.all(sessions.map((s) => (s as any).save()));
      return sessions;
   }

   async update(
      sessionId: string,
      data: UpdateSessionBody,
      currentUser: IUser
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      if (new Date() > session.startTime) {
         throw new BadRequestError(
            "Cannot update a session that has already started."
         );
      }
      if (session.status === SessionStatus.COMPLETED) {
         throw new BadRequestError(
            "Cannot update a session that has already been completed."
         );
      }
      if (session.status === SessionStatus.CONFIRMED) {
         throw new BadRequestError(
            "Cannot update a session that has been confirmed."
         );
      }
      await this.checkParticipantByCommitment(
         (session.learningCommitmentId as any).toString(),
         (currentUser._id as mongoose.Types.ObjectId | string).toString()
      );

      Object.assign(session, data);
      await session.save();
      return session;
   }

   async delete(sessionId: string, userId: string) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      await this.checkParticipantByCommitment(
         (session.learningCommitmentId as any).toString(),
         userId
      );

      if (session.status !== SessionStatus.SCHEDULED) {
         throw new BadRequestError("Only scheduled sessions can be deleted.");
      }

      await session.deleteOne();
   }

   async cancel(sessionId: string, userId: string, reason: string) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");

      await this.checkParticipantByCommitment(
         (session.learningCommitmentId as any).toString(),
         userId
      );

      if (session.status !== SessionStatus.CONFIRMED) {
         throw new BadRequestError("Only confirmed sessions can be cancelled.");
      }

      const now = getVietnamTime();
      const tenMinutesBeforeStart = new Date(
         session.startTime.getTime() - 10 * 60 * 1000
      );

      if (now > tenMinutesBeforeStart) {
         throw new BadRequestError(
            "Session cannot be cancelled within 10 minutes of start time."
         );
      }

      session.status = SessionStatus.CANCELLED;
      session.cancellation = {
         cancelledBy: new mongoose.Types.ObjectId(userId),
         reason: reason,
         cancelledAt: now,
      };

      await session.save();
      return session;
   }

   async listDeletedRejectedForUser(userId: string) {
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      const student = await Student.findOne({ userId }).select("_id").lean();

      const commitments = await LearningCommitment.find({
         $or: [{ tutor: tutor?._id }, { student: student?._id }],
      })
         .select("_id")
         .lean();
      const commitmentIds = commitments.map((c) => c._id);

      if (commitmentIds.length === 0) return [];

      const sessions = await Session.find({
         status: SessionStatus.REJECTED,
         isDeleted: true,
         learningCommitmentId: { $in: commitmentIds },
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
                     select: "_id name email avatarUrl role",
                  },
               },
               {
                  path: "tutor",
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

   async listCancelledForUser(userId: string) {
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      const student = await Student.findOne({ userId }).select("_id").lean();

      const commitments = await LearningCommitment.find({
         $or: [{ tutor: tutor?._id }, { student: student?._id }],
      })
         .select("_id")
         .lean();
      const commitmentIds = commitments.map((c) => c._id);

      if (commitmentIds.length === 0) return [];

      const sessions = await Session.find({
         status: SessionStatus.CANCELLED,
         learningCommitmentId: { $in: commitmentIds },
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
                     select: "_id name email avatarUrl role",
                  },
               },
               {
                  path: "tutor",
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
            path: "cancellation.cancelledBy",
            select: "_id name email role avatarUrl",
         })
         .sort({ "cancellation.cancelledAt": -1 })
         .lean();

      return sessions;
   }
}

export default new SessionService();
