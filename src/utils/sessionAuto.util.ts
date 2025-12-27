import LearningCommitment from "../models/learningCommitment.model";
import Student from "../models/student.model";
import Tutor from "../models/tutor.model";
import { addNotificationJob } from "../queues/notification.queue";
import { NotFoundError, ForbiddenError } from "../utils/error.response";
import mongoose from "mongoose";
import { SessionStatus } from "../types/enums/session.enum";

export const TUTOR_CHECKIN_GRACE_MINUTES = 15;
export const STUDENT_CHECKIN_GRACE_MINUTES = 30;

export function appendLog(
   session: any,
   entry: {
      userRole: "TUTOR" | "STUDENT" | "SYSTEM";
      action: string;
      note?: string;
   }
) {
   if (!session.attendanceLogs) session.attendanceLogs = [];
   session.attendanceLogs.push({ ...entry, createdAt: new Date() });
}

export async function autoFinalizeStudentConfirmationIfDue(session: any) {
   const now = new Date();
   const start = session.startTime as Date;
   const studentConfirmationDeadline = new Date(
      start.getTime() - 15 * 60 * 1000
   );

   if (
      session.status === SessionStatus.SCHEDULED &&
      session.studentConfirmation?.status === "PENDING" &&
      now > studentConfirmationDeadline
   ) {
      session.studentConfirmation = { status: "REJECTED", confirmedAt: now };
      session.isDeleted = true;
      session.deletedAt = now;
      session.status = SessionStatus.REJECTED;
      appendLog(session, {
         userRole: "SYSTEM",
         action: "ABSENT_AUTO",
         note: "Buổi học đã bị hủy: Học sinh không xác nhận trước 15 phút khi bắt đầu",
      });
      await session.save();

      const commitment = await LearningCommitment.findById(
         session.learningCommitmentId
      )
         .populate({ path: "tutor", select: "userId" })
         .lean();
      if (commitment && (commitment as any).tutor?.userId) {
         const tutorUserId = (commitment as any).tutor.userId.toString();
         await addNotificationJob(
            tutorUserId,
            "Buổi học đã bị hủy tự động",
            "Một buổi học đã bị hủy do học sinh không xác nhận tham gia."
         );
      }
   }
}

export async function autoFinalizeAttendanceIfDue(session: any) {
   const now = new Date();
   const end = session.endTime as Date;

   const tutorDeadline =
      session.attendanceWindow?.tutorDeadline ||
      new Date(end.getTime() + TUTOR_CHECKIN_GRACE_MINUTES * 60 * 1000);
   const studentDeadline =
      session.attendanceWindow?.studentDeadline ||
      new Date(end.getTime() + STUDENT_CHECKIN_GRACE_MINUTES * 60 * 1000);
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
      session.absence.reason = "Gia sư đã vượt quá thời hạn điểm danh";
      session.absence.evidenceUrls = [];
      appendLog(session, {
         userRole: "SYSTEM",
         action: "ABSENT_AUTO",
         note: "Gia sư đã vượt quá thời hạn điểm danh",
      });
      session.status = SessionStatus.NOT_CONDUCTED;

      const student = await Student.findById(
         session.learningCommitmentId.student
      )
         .select("userId")
         .lean();
      if (student?.userId) {
         await addNotificationJob(
            student.userId.toString(),
            "Gia sư vắng mặt",
            "Gia sư đã không điểm danh đúng hạn cho một buổi học."
         );
      }
   }

   const tutorAccepted =
      (session.attendanceConfirmation?.tutor?.status || "PENDING") ===
      "ACCEPTED";
   if (tutorAccepted && studentStatus === "PENDING" && now > studentDeadline) {
      session.attendanceConfirmation.student.status = "REJECTED";
      session.attendanceConfirmation.student.decidedAt = now;
      session.absence = session.absence || {};
      session.absence.studentAbsent = true;
      session.absence.decidedAt = now;
      session.absence.reason = "Học sinh đã vượt quá thời hạn điểm danh";
      session.absence.evidenceUrls = [];
      appendLog(session, {
         userRole: "SYSTEM",
         action: "ABSENT_AUTO",
         note: "Học sinh đã vượt quá thời hạn điểm danh",
      });
      session.status = SessionStatus.NOT_CONDUCTED;

      const tutor = await Tutor.findById(session.learningCommitmentId.tutor)
         .select("userId")
         .lean();
      if (tutor?.userId) {
         await addNotificationJob(
            tutor.userId.toString(),
            "Học sinh vắng mặt",
            "Học sinh đã không điểm danh đúng hạn cho một buổi học."
         );
      }
   }

   return session;
}

export async function checkParticipantByCommitment(
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

   if (!commitment) throw new NotFoundError("Learning commitment not found");

   const userIdStr = userId.toString();
   const studentUserId = (commitment as any)?.student?.userId?._id?.toString();
   const tutorUserId = (commitment as any)?.tutor?.userId?._id?.toString();

   if (userIdStr !== studentUserId && userIdStr !== tutorUserId) {
      throw new ForbiddenError(
         "You are not a participant of this learning commitment."
      );
   }
   return commitment;
}
