import Session from "../models/session.model";
import LearningCommitment from "../models/learningCommitment.model";
import {
   NotFoundError,
   BadRequestError,
   ForbiddenError,
} from "../utils/error.response";
import { SessionStatus } from "../types/enums/session.enum";
import mongoose from "mongoose";
import {
   appendLog,
   autoFinalizeAttendanceIfDue,
   checkParticipantByCommitment,
   STUDENT_CHECKIN_GRACE_MINUTES,
   TUTOR_CHECKIN_GRACE_MINUTES,
} from "../utils/sessionAuto.util";
import { Role } from "../types/enums";
import studentModel from "../models/student.model";
import tutorModel from "../models/tutor.model";
import { addNotificationJob } from "../queues/notification.queue";

class AdminSessionService {
   // Copy of logic in SessionService.extendCommitmentForAbsences
   private async extendCommitmentForAbsences(commitmentId: string) {
      const commitment = await LearningCommitment.findById(commitmentId);
      if (!commitment) return;

      commitment.absentSessions = (commitment.absentSessions || 0) + 1;

      const newExtendedWeeks = Math.ceil(commitment.absentSessions / 2);
      const oldExtendedWeeks = commitment.extendedWeeks || 0;

      if (newExtendedWeeks > oldExtendedWeeks) {
         // No endDate on LearningCommitment anymore — only update extendedWeeks.
         commitment.extendedWeeks = newExtendedWeeks;
      }

      await commitment.save();
   }
   async listDisputes(
      status?: "OPEN" | "RESOLVED",
      page: number = 1,
      limit: number = 10
   ) {
      const filter: any = { dispute: { $exists: true } };
      if (status) filter["dispute.status"] = status;

      const skip = (page - 1) * limit;

      const [data, total] = await Promise.all([
         Session.find({ ...filter })
            .select("learningCommitmentId startTime endTime status dispute")
            .populate({
               path: "learningCommitmentId",
               select: "student tutor",
               populate: [
                  {
                     path: "student",
                     select: "userId",
                     populate: { path: "userId", select: "_id name email" },
                  },
                  {
                     path: "tutor",
                     select: "userId",
                     populate: { path: "userId", select: "_id name email" },
                  },
               ],
            })
            .sort({ "dispute.openedAt": -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         Session.countDocuments({ ...filter }),
      ]);

      return {
         data,
         pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
         },
      };
   }

   async getDisputeBySessionId(sessionId: string) {
      const session = await Session.findById(sessionId)
         .select(
            "learningCommitmentId startTime endTime status dispute attendanceConfirmation absence"
         )
         .populate({
            path: "learningCommitmentId",
            select: "student tutor",
            populate: [
               {
                  path: "student",
                  select: "userId",
                  populate: { path: "userId", select: "_id name email" },
               },
               {
                  path: "tutor",
                  select: "userId",
                  populate: { path: "userId", select: "_id name email" },
               },
            ],
         });
      if (!session) throw new NotFoundError("Session not found");
      if (!session.dispute)
         throw new NotFoundError("No dispute for this session");
      return session;
   }

   async resolveDispute(
      sessionId: string,
      adminUserId: string,
      decision: SessionStatus.COMPLETED | SessionStatus.NOT_CONDUCTED,
      adminNotes?: string
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Session not found");
      if (!session.dispute || session.dispute.status !== "OPEN") {
         throw new BadRequestError("Session dispute is not open");
      }

      const prevStatus = session.status;

      // Apply decision
      if (decision === SessionStatus.COMPLETED) {
         // Mark attendance as accepted
         session.attendanceConfirmation =
            session.attendanceConfirmation ||
            ({
               tutor: { status: "PENDING" },
               student: { status: "PENDING" },
               isAttended: false,
            } as any);
         const ac1 = session.attendanceConfirmation!;
         ac1.tutor.status = "ACCEPTED";
         ac1.student.status = "ACCEPTED";
         const now = new Date();
         ac1.tutor.decidedAt = now;
         ac1.student.decidedAt = now;
         ac1.finalizedAt = now;
         ac1.isAttended = true;
         session.status = SessionStatus.COMPLETED;

         // Increment completedSessions if transitioning to COMPLETED
         if (prevStatus !== SessionStatus.COMPLETED) {
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
         }
      } else {
         // NOT_CONDUCTED - vắng mặt
         session.attendanceConfirmation =
            session.attendanceConfirmation ||
            ({
               tutor: { status: "PENDING" },
               student: { status: "PENDING" },
               isAttended: false,
            } as any);
         const ac2 = session.attendanceConfirmation!;
         ac2.isAttended = false;
         session.status = SessionStatus.NOT_CONDUCTED;

         //  Ghi thông tin vắng mặt vào absence object
         const now = new Date();
         session.absence = session.absence || {};
         // Nếu student đã mở dispute (thường là student phàn nàn), thì cả hai vắng
         // Nếu không, có thể chỉ tutor hoặc student vắng
         session.absence.studentAbsent = true;
         session.absence.tutorAbsent = true;
         session.absence.decidedAt = now;
         session.absence.reason =
            adminNotes || "Admin resolved dispute: NOT_CONDUCTED";
         session.absence.evidenceUrls = session.dispute?.evidenceUrls || [];

         // Extend commitment for absence (same behavior as in SessionService)
         try {
            await this.extendCommitmentForAbsences(
               (session.learningCommitmentId as any).toString()
            );
         } catch (e) {}
      }

      // Close dispute
      session.dispute.status = "RESOLVED";
      session.dispute.resolvedAt = new Date();
      session.dispute.resolvedBy = new mongoose.Types.ObjectId(adminUserId);
      session.dispute.decision = decision as any;
      if (adminNotes) session.dispute.adminNotes = adminNotes;

      await session.save();
      return session;
   }

   /**
    * Lấy tất cả session của một learning commitment
    * - Kiểm tra quyền: user phải là tutor hoặc student của commitment đó
    * - Trả về tất cả session (không phân biệt status)
    */
   async getSessionsByCommitmentId(commitmentId: string, userId: string) {
      // Validate commitmentId
      if (!commitmentId || !userId) {
         throw new BadRequestError("commitmentId and userId are required");
      }

      // Lấy commitment
      const commitment = await LearningCommitment.findById(commitmentId)
         .populate({
            path: "student",
            select: "userId",
            populate: { path: "userId", select: "_id name avatarUrl email" },
         })
         .populate({
            path: "tutor",
            select: "userId",
            populate: { path: "userId", select: "_id name avatarUrl email" },
         })
         .populate({
            path: "teachingRequest",
            select: "subject level",
         });

      if (!commitment) {
         throw new NotFoundError("Learning commitment not found");
      }

      // Kiểm tra quyền: user phải là tutor hoặc student của commitment
      const userIdStr = userId.toString();
      const studentUserId = (
         commitment as any
      )?.student?.userId?._id?.toString();
      const tutorUserId = (commitment as any)?.tutor?.userId?._id?.toString();

      if (userIdStr !== studentUserId && userIdStr !== tutorUserId) {
         throw new ForbiddenError(
            "You don't have permission to view sessions for this commitment"
         );
      }

      // Lấy tất cả session của commitment (không phân biệt status, không lọc soft-delete)
      const sessions = await Session.find({
         learningCommitmentId: commitmentId,
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
                  select: "subject level",
               },
            ],
         })
         .populate({
            path: "cancellation.cancelledBy",
            select: "_id name email avatarUrl",
         })
         .sort({ startTime: 1 }); // Sắp xếp theo thời gian tăng dần

      return sessions.map((session) => session.toObject());
   }

   async rejectAttendanceFake(
      sessionId: string,
      userId: string,
      userRole: Role,
      payload?: { reason?: string; evidenceUrls?: string[] }
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Không tìm thấy buổi học");

      await checkParticipantByCommitment(
         session.learningCommitmentId.toString(),
         userId
      );

      if (session.status !== SessionStatus.CONFIRMED) {
         throw new BadRequestError(
            "Chỉ có thể từ chối điểm danh cho buổi học có trạng thái ĐÃ XÁC NHẬN"
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
            session.endTime.getTime() + TUTOR_CHECKIN_GRACE_MINUTES * 60 * 1000
         );
      const studentDeadline =
         session.attendanceWindow?.studentDeadline ||
         new Date(
            session.endTime.getTime() +
               STUDENT_CHECKIN_GRACE_MINUTES * 60 * 1000
         );
      session.attendanceWindow = { tutorDeadline, studentDeadline };

      if (userRole === Role.STUDENT) {
         if (session.attendanceConfirmation.tutor.status !== "ACCEPTED") {
            throw new BadRequestError(
               "Học sinh chỉ có thể từ chối sau khi gia sư đã điểm danh"
            );
         }
      }

      if (userRole === Role.TUTOR) {
         if (session.attendanceConfirmation.tutor.status !== "PENDING") {
            throw new BadRequestError("Gia sư đã quyết định điểm danh rồi");
         }
         session.attendanceConfirmation.tutor.status = "REJECTED";
         session.attendanceConfirmation.tutor.decidedAt = now;
         session.absence = session.absence || {};
         session.absence.tutorAbsent = true;
         session.absence.decidedAt = now;
         session.absence.reason = payload?.reason;
         session.absence.evidenceUrls = payload?.evidenceUrls || [];
         session.status = SessionStatus.NOT_CONDUCTED;

         appendLog(session, {
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
                  "Bằng chứng và lý do là bắt buộc để tranh chấp sau khi gia sư đã điểm danh"
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
            appendLog(session, {
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
            appendLog(session, {
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

   async confirmAttendanceFake(
      sessionId: string,
      userId: string,
      userRole: Role
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Không tìm thấy buổi học");

      await checkParticipantByCommitment(
         session.learningCommitmentId.toString(),
         userId
      );

      if (session.status !== SessionStatus.CONFIRMED) {
         throw new BadRequestError(
            "Chỉ có thể xác nhận điểm danh cho buổi học có trạng thái ĐÃ XÁC NHẬN"
         );
      }

      const now = new Date();

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

      const tutorDeadline =
         session.attendanceWindow?.tutorDeadline ||
         new Date(
            session.endTime.getTime() + TUTOR_CHECKIN_GRACE_MINUTES * 60 * 1000
         );
      const studentDeadline =
         session.attendanceWindow?.studentDeadline ||
         new Date(
            session.endTime.getTime() +
               STUDENT_CHECKIN_GRACE_MINUTES * 60 * 1000
         );
      session.attendanceWindow = { tutorDeadline, studentDeadline };

      if (
         userRole === Role.STUDENT &&
         session.attendanceConfirmation.tutor.status !== "ACCEPTED"
      ) {
         throw new BadRequestError(
            "Học sinh chỉ có thể xác nhận sau khi gia sư đã điểm danh"
         );
      }

      if (userRole === Role.TUTOR && now > tutorDeadline) {
         await autoFinalizeAttendanceIfDue(session);
         await session.save();
         throw new BadRequestError("Thời hạn điểm danh của gia sư đã hết");
      }
      if (userRole === Role.STUDENT && now > studentDeadline) {
         await autoFinalizeAttendanceIfDue(session);
         await session.save();
         throw new BadRequestError("Thời hạn điểm danh của học sinh đã hết");
      }

      if (userRole === Role.TUTOR) {
         if (session.attendanceConfirmation.tutor.status !== "PENDING") {
            throw new BadRequestError("Gia sư đã xác nhận điểm danh rồi");
         }
         session.attendanceConfirmation.tutor.status = "ACCEPTED";
         session.attendanceConfirmation.tutor.decidedAt = now;
         appendLog(session, { userRole: "TUTOR", action: "CHECKED_IN" });
      } else if (userRole === Role.STUDENT) {
         if (session.attendanceConfirmation.student.status !== "PENDING") {
            throw new BadRequestError("Học sinh đã xác nhận điểm danh rồi");
         }
         session.attendanceConfirmation.student.status = "ACCEPTED";
         session.attendanceConfirmation.student.decidedAt = now;
         appendLog(session, { userRole: "STUDENT", action: "CHECKED_IN" });
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
                  // Notify both that commitment is completed
                  const studentUser = await studentModel
                     .findById(commitment.student)
                     .select("userId")
                     .lean();
                  const tutorUser = await tutorModel
                     .findById(commitment.tutor)
                     .select("userId")
                     .lean();
                  const notifTitle = "Hoàn thành cam kết học";
                  const notifMessage =
                     "Chúc mừng! Bạn đã hoàn thành tất cả các buổi học trong cam kết.";
                  if (studentUser?.userId) {
                     await addNotificationJob(
                        studentUser.userId.toString(),
                        notifTitle,
                        notifMessage
                     );
                  }
                  if (tutorUser?.userId) {
                     await addNotificationJob(
                        tutorUser.userId.toString(),
                        notifTitle,
                        notifMessage
                     );
                  }
               }
               await commitment.save();
            }
         } else {
            session.attendanceConfirmation.isAttended = false;
            session.status = SessionStatus.NOT_CONDUCTED;
         }
      }

      await session.save();
      return session;
   }
}

export default new AdminSessionService();
