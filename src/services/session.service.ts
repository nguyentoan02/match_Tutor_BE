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
import { addNotificationJob } from "../queues/notification.queue";
import User from "../models/user.model";
import teachingRequestModel from "../models/teachingRequest.model";
import { TeachingRequestStatus } from "../types/enums";
import tutorModel from "../models/tutor.model";
import suggestSchedulesModel from "../models/suggestSchedules.model";
import TeachingRequest from "../models/teachingRequest.model";
import {
   TUTOR_CHECKIN_GRACE_MINUTES,
   STUDENT_CHECKIN_GRACE_MINUTES,
   appendLog,
   autoFinalizeStudentConfirmationIfDue,
   autoFinalizeAttendanceIfDue,
   checkParticipantByCommitment,
} from "../utils/sessionAuto.util";

class SessionService {
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
                  select: "subject level status",
               },
            ],
         })
         .populate({
            path: "cancellation.cancelledBy",
            select: "_id name email avatarUrl",
         });

      if (!session) throw new NotFoundError("Session not found");

      await checkParticipantByCommitment(
         (session.learningCommitmentId as any)._id.toString(),
         userId.toString()
      );
      await autoFinalizeStudentConfirmationIfDue(session as any);
      await autoFinalizeAttendanceIfDue(session as any);
      await session.save();
      return session.toObject();
   }

   async confirmParticipation(
      sessionId: string,
      studentUserId: string,
      decision: "ACCEPTED" | "REJECTED"
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Không tìm thấy buổi học");

      await checkParticipantByCommitment(
         session.learningCommitmentId.toString(),
         studentUserId
      );

      if (session.studentConfirmation?.status !== "PENDING") {
         throw new BadRequestError(
            "Xác nhận tham gia buổi học đã được thực hiện"
         );
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

      // Nếu học sinh xác nhận tham gia, cập nhật các buổi còn lại trong cùng LearningCommitment
      if (decision === "ACCEPTED") {
         try {
            const now = new Date();
            await Session.updateMany(
               {
                  learningCommitmentId: session.learningCommitmentId,
                  _id: { $ne: session._id },
                  isDeleted: { $ne: true },
                  status: SessionStatus.SCHEDULED,
                  "studentConfirmation.status": "PENDING",
               },
               {
                  $set: {
                     "studentConfirmation.status": "ACCEPTED",
                     "studentConfirmation.confirmedAt": now,
                     status: SessionStatus.CONFIRMED,
                  },
               }
            );
         } catch (e) {
            console.error("Failed to bulk-confirm remaining sessions:", e);
         }
      }

      // Notify tutor about student's decision
      const commitment = await LearningCommitment.findById(
         session.learningCommitmentId
      )
         .populate({ path: "tutor", select: "userId" })
         .lean();
      const student = await User.findById(studentUserId).select("name").lean();
      if (commitment && (commitment as any).tutor?.userId && student) {
         const tutorUserId = (commitment as any).tutor.userId.toString();
         const studentName = student.name || "Học sinh";
         const title = `Buổi học đã được ${
            decision === "ACCEPTED" ? "xác nhận" : "từ chối"
         }`;
         const message = `${studentName} đã ${
            decision === "ACCEPTED" ? "xác nhận" : "từ chối"
         } tham gia buổi học.`;
         await addNotificationJob(tutorUserId, title, message);
      }

      return session;
   }

   async confirmAttendance(sessionId: string, userId: string, userRole: Role) {
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

      if (now < session.startTime) {
         throw new BadRequestError(
            "Chỉ có thể điểm danh khi đến thời gian bắt đầu buổi học"
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
                  const studentUser = await Student.findById(commitment.student)
                     .select("userId")
                     .lean();
                  const tutorUser = await Tutor.findById(commitment.tutor)
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
   async rejectAttendance(
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

      const now = new Date();
      if (now < session.startTime) {
         throw new BadRequestError(
            "Chỉ có thể báo vắng, khiếu nại khi tới thời gian bắt đầu"
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

      // const now = new Date();

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

      await Promise.all(
         sessions.map(async (session) => {
            try {
               await autoFinalizeStudentConfirmationIfDue(session as any);

               await autoFinalizeAttendanceIfDue(session as any);

               // Nếu dữ liệu có thay đổi sau các hàm check trên thì lưu lại
               if ((session as any).isModified()) {
                  await (session as any).save();
               }
            } catch (error) {
               console.error(`Error updating session ${session._id}:`, error);
            }
         })
      );

      return sessions;
   }

   async update(
      sessionId: string,
      data: UpdateSessionBody,
      currentUser: IUser
   ) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Không tìm thấy buổi học");

      if (new Date() > session.startTime) {
         throw new BadRequestError("Không thể cập nhật buổi học đã bắt đầu");
      }
      if (session.status === SessionStatus.COMPLETED) {
         throw new BadRequestError("Không thể cập nhật buổi học đã hoàn thành");
      }
      // Allow updating confirmed sessions — but after update revert to SCHEDULED
      const wasConfirmed = session.status === SessionStatus.CONFIRMED;
      if (wasConfirmed) {
         session.status = SessionStatus.SCHEDULED;
         session.studentConfirmation = { status: "PENDING" } as any;
         // clear soft-delete flags if set
         session.isDeleted = false;
         session.deletedAt = undefined as any;
         session.deletedBy = undefined as any;
      }

      const commitment = await checkParticipantByCommitment(
         (session.learningCommitmentId as any).toString(),
         (currentUser._id as mongoose.Types.ObjectId | string).toString()
      );

      if (commitment.status !== "active") {
         throw new BadRequestError(
            "Chỉ có thể cập nhật buổi học cho cam kết học tập đang hoạt động."
         );
      }

      // Validate time changes
      if (data.startTime || data.endTime) {
         const newStart = data.startTime
            ? new Date(data.startTime)
            : session.startTime;
         const newEnd = data.endTime ? new Date(data.endTime) : session.endTime;

         if (!(newStart < newEnd)) {
            throw new BadRequestError(
               "Thời gian bắt đầu cần trước thời gian kết thúc"
            );
         }

         const now = new Date();
         if (newStart < now) {
            throw new BadRequestError(
               "Không thể cập nhật buổi học vào quá khứ"
            );
         }

         const vnStart = moment(newStart).tz("Asia/Ho_Chi_Minh");
         const vnEnd = moment(newEnd).tz("Asia/Ho_Chi_Minh");

         if (!vnStart.isSame(vnEnd, "day")) {
            throw new BadRequestError(
               "Thời gian buổi học nên nằm trong cùng một ngày"
            );
         }
         // Compute commitment boundaries from startDate + duration (totalSessions / sessionsPerWeek) + extendedWeeks
         const sessionsPerWeek = commitment.sessionsPerWeek || 1;
         const weeksNeeded = Math.ceil(
            (commitment.totalSessions || 0) / sessionsPerWeek
         );
         const totalWeeks = weeksNeeded + (commitment.extendedWeeks || 0);
         const commitmentStartVN = moment(commitment.startDate)
            .tz("Asia/Ho_Chi_Minh")
            .startOf("day");
         const commitmentEndVN = moment(commitment.startDate)
            .tz("Asia/Ho_Chi_Minh")
            .add(totalWeeks, "weeks")
            .endOf("day");

         if (
            vnStart.isBefore(commitmentStartVN) ||
            vnEnd.isAfter(commitmentEndVN)
         ) {
            throw new BadRequestError(
               "Thời gian buổi học nên nằm trong thời gian cam kết học"
            );
         }

         // Check conflicts
         const tutorId = (commitment as any).tutor._id;
         const studentId = (commitment as any).student._id;

         const tutorCommitments = await LearningCommitment.find({
            tutor: tutorId,
            status: { $in: ["active", "pending_agreement", "in_dispute"] },
         })
            .select("_id")
            .lean();
         const tutorCommitmentIds = tutorCommitments.map((c) => c._id);

         const tutorConflict = await Session.findOne({
            _id: { $ne: sessionId },
            learningCommitmentId: { $in: tutorCommitmentIds },
            isDeleted: { $ne: true },
            status: {
               $nin: [
                  SessionStatus.REJECTED,
                  SessionStatus.CANCELLED,
                  SessionStatus.NOT_CONDUCTED,
               ],
            },
            $or: [{ startTime: { $lt: newEnd }, endTime: { $gt: newStart } }],
         }).lean();

         if (tutorConflict) {
            throw new BadRequestError(
               "Gia sư có lịch trùng vào thời gian này."
            );
         }

         const studentCommitments = await LearningCommitment.find({
            student: studentId,
            status: { $in: ["active", "pending_agreement", "admin_review"] },
         })
            .select("_id")
            .lean();
         const studentCommitmentIds = studentCommitments.map((c) => c._id);

         const studentConflict = await Session.findOne({
            _id: { $ne: sessionId },
            learningCommitmentId: { $in: studentCommitmentIds },
            isDeleted: { $ne: true },
            status: {
               $nin: [
                  SessionStatus.REJECTED,
                  SessionStatus.CANCELLED,
                  SessionStatus.NOT_CONDUCTED,
               ],
            },
            $or: [{ startTime: { $lt: newEnd }, endTime: { $gt: newStart } }],
         }).lean();

         if (studentConflict) {
            throw new BadRequestError(
               "Học sinh có lịch trùng vào thời gian này."
            );
         }

         // Check conflict với suggestion schedules đang pending của tutor
         const tutorTeachingRequests = await TeachingRequest.find({
            tutorId: tutorId,
         })
            .select("_id")
            .lean();
         const tutorTRIds = tutorTeachingRequests.map((tr) => tr._id);

         if (tutorTRIds.length > 0) {
            const tutorPendingSuggestions = await suggestSchedulesModel
               .find({
                  teachingRequestId: { $in: tutorTRIds },
                  "studentResponse.status": "PENDING",
               })
               .select("schedules")
               .lean();

            for (const suggestion of tutorPendingSuggestions) {
               if (suggestion.schedules && suggestion.schedules.length > 0) {
                  for (const schedule of suggestion.schedules) {
                     const sStart = new Date(schedule.start);
                     const sEnd = new Date(schedule.end);
                     if (newStart < sEnd && newEnd > sStart) {
                        throw new BadRequestError(
                           "Gia sư có lịch đề xuất đang chờ phản hồi vào thời gian này."
                        );
                     }
                  }
               }
            }
         }

         // Check conflict với suggestion schedules đang pending của student
         const studentTeachingRequests = await TeachingRequest.find({
            studentId: studentId,
         })
            .select("_id")
            .lean();
         const studentTRIds = studentTeachingRequests.map((tr) => tr._id);

         if (studentTRIds.length > 0) {
            const studentPendingSuggestions = await suggestSchedulesModel
               .find({
                  teachingRequestId: { $in: studentTRIds },
                  "studentResponse.status": "PENDING",
               })
               .select("schedules")
               .lean();

            for (const suggestion of studentPendingSuggestions) {
               if (suggestion.schedules && suggestion.schedules.length > 0) {
                  for (const schedule of suggestion.schedules) {
                     const sStart = new Date(schedule.start);
                     const sEnd = new Date(schedule.end);
                     if (newStart < sEnd && newEnd > sStart) {
                        throw new BadRequestError(
                           "Học sinh có lịch đề xuất đang chờ phản hồi vào thời gian này."
                        );
                     }
                  }
               }
            }
         }

         // Update attendance window
         session.attendanceWindow = {
            tutorDeadline: new Date(newEnd.getTime() + 15 * 60 * 1000),
            studentDeadline: new Date(newEnd.getTime() + 30 * 60 * 1000),
         };
      }

      Object.assign(session, data);

      if (wasConfirmed) {
         // revert to scheduled so student must confirm again
         session.status = SessionStatus.SCHEDULED;
         session.studentConfirmation = { status: "PENDING" } as any;
         // clear soft-delete flags if set
         session.isDeleted = false;
         session.deletedAt = undefined as any;
         session.deletedBy = undefined as any;
      }

      await session.save();

      // Notify the other participant about the update
      try {
         const comm = await LearningCommitment.findById(
            session.learningCommitmentId
         )
            .populate({ path: "student", select: "userId" })
            .populate({ path: "tutor", select: "userId" })
            .lean();

         if (comm) {
            const studentUserId = (comm as any).student?.userId?.toString();
            const tutorUserId = (comm as any).tutor?.userId?.toString();
            const isUpdatedByStudent =
               (currentUser._id as any).toString() === studentUserId;
            const targetUserId = isUpdatedByStudent
               ? tutorUserId
               : studentUserId;
            if (targetUserId) {
               const updaterName = currentUser.name || "Một người dùng";
               const timeStr = moment(session.startTime)
                  .tz("Asia/Ho_Chi_Minh")
                  .format("HH:mm DD/MM/YYYY");
               const title = "Buổi học đã được cập nhật";
               const message = `${updaterName} đã cập nhật buổi học vào ${timeStr}. Vui lòng kiểm tra chi tiết.`;
               await addNotificationJob(targetUserId, title, message);
            }
         }
      } catch (e) {
         console.error("Failed to notify participant about session update:", e);
      }

      return session;
   }

   async delete(sessionId: string, userId: string) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Không tìm thấy buổi học");

      await checkParticipantByCommitment(
         (session.learningCommitmentId as any).toString(),
         userId
      );

      if (session.status !== SessionStatus.SCHEDULED) {
         throw new BadRequestError(
            "Chỉ có thể xóa các buổi học có trạng thái CHỈ ĐỊNH"
         );
      }

      await session.deleteOne();
   }

   async cancel(sessionId: string, userId: string, reason: string) {
      const session = await Session.findById(sessionId);
      if (!session) throw new NotFoundError("Không tìm thấy buổi học");

      await checkParticipantByCommitment(
         (session.learningCommitmentId as any).toString(),
         userId
      );

      if (session.status !== SessionStatus.CONFIRMED) {
         throw new BadRequestError("Chỉ có thể hủy các buổi học được xác nhận");
      }

      const now = new Date();
      const tenMinutesBeforeStart = new Date(
         session.startTime.getTime() - 10 * 60 * 1000
      );

      if (now > tenMinutesBeforeStart) {
         throw new BadRequestError(
            "Không thể hủy buổi học trong vòng 10 phút trước khi bắt đầu"
         );
      }

      session.status = SessionStatus.CANCELLED;
      session.cancellation = {
         cancelledBy: new mongoose.Types.ObjectId(userId),
         reason: reason,
         cancelledAt: now,
      };

      await session.save();

      // Notify the other participant about the cancellation
      const commitment = await LearningCommitment.findById(
         session.learningCommitmentId
      )
         .populate({ path: "student", select: "userId" })
         .populate({ path: "tutor", select: "userId" })
         .lean();

      if (commitment) {
         const canceller = await User.findById(userId).select("name").lean();
         const cancellerName = canceller?.name || "Một người dùng";
         const studentUserId = (commitment as any).student?.userId?.toString();
         const tutorUserId = (commitment as any).tutor?.userId?.toString();
         const isCancelledByStudent = userId.toString() === studentUserId;

         const targetUserId = isCancelledByStudent
            ? tutorUserId
            : studentUserId;
         if (targetUserId) {
            await addNotificationJob(
               targetUserId,
               "Buổi học đã bị hủy",
               `${cancellerName} đã hủy một buổi học sắp tới. Lý do: ${reason}`
            );
         }
      }
      return session;
   }

   async createMany(
      data: {
         learningCommitmentId: string;
         sessions: { startTime: Date | string; endTime: Date | string }[];
         location?: string;
         notes?: string;
      },
      currentUser: IUser
   ) {
      // 1. Validate cơ bản & Quyền hạn (Giống create)
      const commitment = await LearningCommitment.findById(
         data.learningCommitmentId
      );
      if (!commitment) throw new NotFoundError("Learning commitment not found");

      if (currentUser.role !== Role.TUTOR) {
         throw new ForbiddenError("Chỉ gia sư mới được tạo buổi học");
      }

      const tutor = await Tutor.findOne({ userId: currentUser._id });
      if (!tutor || String(commitment.tutor) !== String(tutor._id)) {
         throw new ForbiddenError(
            "Bạn không phải là gia sư có thể tạo buổi học cho học sinh này"
         );
      }

      if (commitment.status !== "active") {
         throw new BadRequestError(
            "Buổi học chỉ có thể tạo khi trạng thái cam kết là đang hoạt động"
         );
      }

      // [FIX 1] Check Payment
      if ((commitment.studentPaidAmount || 0) < (commitment.totalAmount || 0)) {
         throw new BadRequestError(
            "Không thể tạo buổi học. Học sinh chưa thanh toán đủ"
         );
      }

      // 2. Validate hạn mức
      const completed = commitment.completedSessions || 0;
      const total = commitment.totalSessions;

      const currentPendingSessions = await Session.countDocuments({
         learningCommitmentId: commitment._id,
         isDeleted: { $ne: true },
         status: {
            $in: [
               SessionStatus.SCHEDULED,
               SessionStatus.CONFIRMED,
               SessionStatus.DISPUTED,
            ],
         },
      });

      // Đếm số session vắng (NOT_CONDUCTED) để cho phép tạo thêm
      const absentSessions = await Session.countDocuments({
         learningCommitmentId: commitment._id,
         isDeleted: { $ne: true },
         status: SessionStatus.NOT_CONDUCTED,
      });

      // Cho phép tạo thêm số session bằng số session vắng
      // remainingSlots = total - completed - currentPendingSessions + absentSessions
      const remainingSlots =
         total - completed - currentPendingSessions + absentSessions;
      if (remainingSlots <= 0) {
         throw new BadRequestError(
            "Không thể tạo thêm buổi: đã đủ số buổi cam kết."
         );
      }

      // --- [FIX 2] CHUẨN BỊ BOUNDARY NGÀY CAM KẾT (Tính 1 lần) ---
      // Compute commitment boundaries from startDate + duration (totalSessions / sessionsPerWeek) + extendedWeeks
      const sessionsPerWeek = commitment.sessionsPerWeek || 1;
      const weeksNeeded = Math.ceil(
         (commitment.totalSessions || 0) / sessionsPerWeek
      );
      const totalWeeks = weeksNeeded + (commitment.extendedWeeks || 0);
      const commitmentStartVN = moment(commitment.startDate)
         .tz("Asia/Ho_Chi_Minh")
         .startOf("day");
      const commitmentEndVN = moment(commitment.startDate)
         .tz("Asia/Ho_Chi_Minh")
         .add(totalWeeks, "weeks")
         .endOf("day");

      // Chuẩn bị query conflict (các cam kết liên quan cho tutor/student)
      const tutorCommitments = await LearningCommitment.find({
         tutor: commitment.tutor,
         status: { $in: ["active", "pending_agreement", "in_dispute"] },
      })
         .select("_id")
         .lean();
      const tutorCommitmentIds = tutorCommitments.map((c) => c._id);

      const studentCommitments = await LearningCommitment.find({
         student: commitment.student,
         status: { $in: ["active", "pending_agreement", "in_dispute"] },
      })
         .select("_id")
         .lean();
      const studentCommitmentIds = studentCommitments.map((c) => c._id);

      const sessionDocs: any[] = [];
      const now = new Date();

      // Nếu không truyền sessions thì lỗi
      if (!data.sessions || data.sessions.length === 0) {
         throw new BadRequestError(
            "Cần cung cấp ít nhất một buổi mẫu để tự động lặp hàng tuần."
         );
      }

      // chuẩn hóa template sessions (ứng với 1 tuần mẫu)
      const templateSessions = data.sessions.map((s) => {
         const sStart = new Date(s.startTime);
         const sEnd = new Date(s.endTime);
         if (!(sStart < sEnd)) {
            throw new BadRequestError(
               "Thời gian bắt đầu cần trước thời gian kết thúc"
            );
         }
         return { start: sStart, end: sEnd };
      });

      // Tạo các buổi lặp hàng tuần dựa trên template
      const maxToCreate = Math.min(remainingSlots, total); // limit tổng
      let createdCount = 0;
      const weekCounts: Record<string, number> = {}; // key: `${year}-W${isoWeek}`
      const tz = "Asia/Ho_Chi_Minh";
      const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
      const MAX_WEEKS = 520; // giới hạn tối đa số tuần để tránh vòng lặp vô hạn

      // helper
      const weekKeyFor = (dt: Date) => {
         const m = moment(dt).tz(tz);
         return `${m.isoWeekYear()}-W${m.isoWeek()}`;
      };

      // chuẩn bị candidates: cho mỗi template tìm lần xuất hiện đầu tiên >= now (và >= commitment.startDate)
      type Candidate = {
         start: Date;
         end: Date;
         templateIndex: number;
      };

      const candidates: Candidate[] = templateSessions.map((t, i) => {
         // compute minimal weeks to add so that start >= now AND start >= commitment.startDate
         const baseStart = t.start;
         const baseEnd = t.end;
         const minRef = moment
            .max(moment(now).tz(tz), moment(commitment.startDate).tz(tz))
            .toDate();
         let weeksToAdd = Math.ceil(
            (minRef.getTime() - baseStart.getTime()) / WEEK_MS
         );
         if (isNaN(weeksToAdd) || weeksToAdd < 0) weeksToAdd = 0;
         const curStart = new Date(baseStart.getTime() + weeksToAdd * WEEK_MS);
         const curEnd = new Date(baseEnd.getTime() + weeksToAdd * WEEK_MS);
         return { start: curStart, end: curEnd, templateIndex: i };
      });

      // guard to avoid infinite loops
      const MAX_ITER = MAX_WEEKS * Math.max(1, templateSessions.length);
      let iter = 0;

      while (
         createdCount < maxToCreate &&
         iter < MAX_ITER &&
         candidates.length > 0
      ) {
         // pick earliest candidate
         candidates.sort((a, b) => a.start.getTime() - b.start.getTime());
         const cand = candidates.shift()!;

         iter++;

         const vnNewStart = moment(cand.start).tz(tz);
         const vnNewEnd = moment(cand.end).tz(tz);

         // stop if beyond commitment end
         if (vnNewStart.isAfter(commitmentEndVN)) {
            // this candidate and further weekly advances will also be beyond end => discard candidate
            continue;
         }

         // ensure within commitment boundaries
         if (
            vnNewStart.isBefore(commitmentStartVN) ||
            vnNewEnd.isAfter(commitmentEndVN)
         ) {
            // advance this candidate by 1 week and push back
            cand.start = new Date(cand.start.getTime() + WEEK_MS);
            cand.end = new Date(cand.end.getTime() + WEEK_MS);
            candidates.push(cand);
            continue;
         }

         // skip if in the past (shouldn't happen because we initialized >= now), but guard
         if (cand.start.getTime() < now.getTime()) {
            cand.start = new Date(cand.start.getTime() + WEEK_MS);
            cand.end = new Date(cand.end.getTime() + WEEK_MS);
            candidates.push(cand);
            continue;
         }

         const key = weekKeyFor(cand.start);
         weekCounts[key] = weekCounts[key] || 0;
         const weeklyLimit =
            commitment.sessionsPerWeek || templateSessions.length || 1;

         // respect sessionsPerWeek
         if (weekCounts[key] >= weeklyLimit) {
            // cannot schedule more in this calendar week => advance candidate by 1 week
            cand.start = new Date(cand.start.getTime() + WEEK_MS);
            cand.end = new Date(cand.end.getTime() + WEEK_MS);
            candidates.push(cand);
            continue;
         }

         // Conflict checks (tutor & student)
         const tutorConflict = await Session.findOne({
            learningCommitmentId: { $in: tutorCommitmentIds },
            isDeleted: { $ne: true },
            status: {
               $nin: [
                  SessionStatus.REJECTED,
                  SessionStatus.CANCELLED,
                  SessionStatus.NOT_CONDUCTED,
               ],
            },
            $or: [
               { startTime: { $lt: cand.end }, endTime: { $gt: cand.start } },
            ],
         }).lean();
         if (tutorConflict) {
            throw new BadRequestError(
               `Giáo viên bị trùng lịch vào lúc ${vnNewStart.format(
                  "HH:mm DD/MM/YYYY"
               )}`
            );
         }

         const studentConflict = await Session.findOne({
            learningCommitmentId: { $in: studentCommitmentIds },
            isDeleted: { $ne: true },
            status: {
               $nin: [
                  SessionStatus.REJECTED,
                  SessionStatus.CANCELLED,
                  SessionStatus.NOT_CONDUCTED,
               ],
            },
            $or: [
               { startTime: { $lt: cand.end }, endTime: { $gt: cand.start } },
            ],
         }).lean();
         if (studentConflict) {
            throw new BadRequestError(
               `Học sinh bị trùng lịch vào lúc ${vnNewStart.format(
                  "HH:mm DD/MM/YYYY"
               )}`
            );
         }

         // Check conflict với suggestion schedules đang pending của tutor
         const tutorTeachingRequests = await TeachingRequest.find({
            tutorId: commitment.tutor,
         })
            .select("_id")
            .lean();
         const tutorTRIds = tutorTeachingRequests.map((tr) => tr._id);

         if (tutorTRIds.length > 0) {
            const tutorPendingSuggestions = await suggestSchedulesModel
               .find({
                  teachingRequestId: { $in: tutorTRIds },
                  "studentResponse.status": "PENDING",
               })
               .select("schedules")
               .lean();

            for (const suggestion of tutorPendingSuggestions) {
               if (suggestion.schedules && suggestion.schedules.length > 0) {
                  for (const schedule of suggestion.schedules) {
                     const sStart = new Date(schedule.start);
                     const sEnd = new Date(schedule.end);
                     if (cand.start < sEnd && cand.end > sStart) {
                        throw new BadRequestError(
                           `Gia sư có lịch đề xuất đang chờ phản hồi vào lúc ${vnNewStart.format(
                              "HH:mm DD/MM/YYYY"
                           )}`
                        );
                     }
                  }
               }
            }
         }

         // Check conflict với suggestion schedules đang pending của student
         const studentTeachingRequests = await TeachingRequest.find({
            studentId: commitment.student,
         })
            .select("_id")
            .lean();
         const studentTRIds = studentTeachingRequests.map((tr) => tr._id);

         if (studentTRIds.length > 0) {
            const studentPendingSuggestions = await suggestSchedulesModel
               .find({
                  teachingRequestId: { $in: studentTRIds },
                  "studentResponse.status": "PENDING",
               })
               .select("schedules")
               .lean();

            for (const suggestion of studentPendingSuggestions) {
               if (suggestion.schedules && suggestion.schedules.length > 0) {
                  for (const schedule of suggestion.schedules) {
                     const sStart = new Date(schedule.start);
                     const sEnd = new Date(schedule.end);
                     if (cand.start < sEnd && cand.end > sStart) {
                        throw new BadRequestError(
                           `Học sinh có lịch đề xuất đang chờ phản hồi vào lúc ${vnNewStart.format(
                              "HH:mm DD/MM/YYYY"
                           )}`
                        );
                     }
                  }
               }
            }
         }

         // tạo session doc
         sessionDocs.push({
            learningCommitmentId: commitment._id,
            startTime: cand.start,
            endTime: cand.end,
            location: data.location,
            notes: data.notes,
            createdBy: currentUser._id,
            attendanceWindow: {
               tutorDeadline: new Date(cand.end.getTime() + 15 * 60 * 1000),
               studentDeadline: new Date(cand.end.getTime() + 30 * 60 * 1000),
            },
            status: SessionStatus.SCHEDULED,
         });

         weekCounts[key] += 1;
         createdCount += 1;

         // advance this candidate by 1 week and push back for next rounds
         cand.start = new Date(cand.start.getTime() + WEEK_MS);
         cand.end = new Date(cand.end.getTime() + WEEK_MS);
         candidates.push(cand);
      } // end while

      if (sessionDocs.length === 0) {
         throw new BadRequestError(
            "Không có buổi hợp lệ nào để tạo dựa trên template và giới hạn cam kết."
         );
      }

      const createdSessions = await Session.insertMany(sessionDocs);

      //  Notify  about new sessions
      const student = await Student.findById(commitment.student)
         .select("userId")
         .lean();
      if (student?.userId) {
         const studentUserId = student.userId.toString();
         const tutorName = currentUser.name || "Gia sư của bạn";
         const title = "Các buổi học mới đã được tạo";
         const message = `${tutorName} đã tạo ${createdSessions.length} buổi học mới. Vui lòng vào và xác nhận.`;
         await addNotificationJob(studentUserId, title, message);
      }

      return createdSessions;
   }

   async getBusy(userId: string) {
      console.log(userId);
      const tutorId = await tutorModel.findOne({ userId });
      if (!tutorId) {
         throw new BadRequestError("no tutorId");
      }

      // Lấy danh sách học sinh đang học với gia sư này
      const trStuList = await teachingRequestModel
         .find({
            tutorId: tutorId._id,
            status: TeachingRequestStatus.ACCEPTED,
         })
         .select("studentId");

      const stuIds = trStuList.map((s) => s.studentId);

      // 1. Lấy các session với trạng thái SCHEDULED hoặc CONFIRMED từ learning commitments active
      // Lấy tất cả learning commitments của các học sinh này với các gia sư KHÁC (không phải gia sư hiện tại)
      const stuLCList = await LearningCommitment.find({
         student: { $in: stuIds },
         tutor: { $ne: tutorId._id }, // Chỉ lấy commitments với gia sư khác
         status: "active",
      }).select("_id");

      const stuLCIds = stuLCList.map((t) => t._id);

      // Lấy các session với trạng thái SCHEDULED hoặc CONFIRMED
      const stuSessions = await Session.find({
         learningCommitmentId: { $in: stuLCIds },
         status: { $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED] },
         isDeleted: { $ne: true },
      })
         .select("startTime endTime status learningCommitmentId")
         .populate({
            path: "learningCommitmentId",
            select: "teachingRequest tutor",
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
         });

      // 2. Lấy các suggestion schedules đang pending của học sinh với gia sư khác
      // Lấy tất cả teaching requests của các học sinh này với gia sư khác
      const otherTeachingRequests = await TeachingRequest.find({
         studentId: { $in: stuIds },
         tutorId: { $ne: tutorId._id }, // Chỉ lấy với gia sư khác
      }).select("_id");

      const otherTeachingRequestIds = otherTeachingRequests.map((tr) => tr._id);

      let studentBusySchedules: any[] = [];
      if (otherTeachingRequestIds.length > 0) {
         // Lấy suggestion mới nhất của mỗi teaching request có status PENDING
         const latestSuggestionsPromises = otherTeachingRequestIds.map((trId) =>
            suggestSchedulesModel
               .findOne({
                  teachingRequestId: trId,
                  "studentResponse.status": "PENDING", // Chỉ lấy những suggestion đang pending
               })
               .select("schedules teachingRequestId tutorId")
               .populate({
                  path: "teachingRequestId",
                  select: "tutorId studentId",
                  populate: [
                     {
                        path: "tutorId",
                        select: "userId",
                        populate: {
                           path: "userId",
                           select: "_id name avatarUrl email",
                        },
                     },
                     {
                        path: "studentId",
                        select: "userId",
                        populate: {
                           path: "userId",
                           select: "_id name avatarUrl email",
                        },
                     },
                  ],
               })
               .sort({ createdAt: -1 }) // Lấy suggestion mới nhất
               .limit(1)
         );

         const latestSuggestionsResults = await Promise.all(
            latestSuggestionsPromises
         );
         const otherSuggestions = latestSuggestionsResults.filter(Boolean); // Loại bỏ null/undefined

         // Chuyển đổi format để dễ sử dụng - chuyển schedules thành format giống session
         studentBusySchedules = otherSuggestions.flatMap((suggestion: any) => {
            if (!suggestion.schedules || suggestion.schedules.length === 0) {
               return [];
            }
            return suggestion.schedules.map((schedule: any) => ({
               startTime: schedule.start,
               endTime: schedule.end,
               status: "PENDING_SUGGESTION", // Đánh dấu là từ suggestion pending
               type: "suggestion",
               tutor: suggestion.teachingRequestId?.tutorId?.userId || null,
               student: suggestion.teachingRequestId?.studentId?.userId || null,
               teachingRequestId: suggestion.teachingRequestId?._id || null,
            }));
         });
      }

      // Merge sessions và suggestion schedules lại với nhau
      const allBusyTimes = [
         ...stuSessions.map((session: any) => ({
            startTime: session.startTime,
            endTime: session.endTime,
            status: session.status,
            type: "session",
            learningCommitmentId: session.learningCommitmentId?._id || null,
            student: session.learningCommitmentId?.student?.userId || null,
            tutor: session.learningCommitmentId?.tutor?.userId || null,
         })),
         ...studentBusySchedules,
      ];

      return allBusyTimes;
   }

   async getBusyForStudent(userId: string) {
      console.log(userId);
      const student = await Student.findOne({ userId });
      if (!student) {
         throw new BadRequestError("no studentId");
      }

      // Lấy danh sách learning commitments của học sinh này
      const studentLCList = await LearningCommitment.find({
         student: student._id,
         status: "active",
      }).select("tutor _id");

      // Lấy danh sách gia sư mà học sinh đang học
      const tutorIds = studentLCList.map((lc) => lc.tutor);

      // 1. Lấy các session với trạng thái SCHEDULED hoặc CONFIRMED từ learning commitments active
      // Lấy tất cả learning commitments của các gia sư này với các học sinh KHÁC (không phải học sinh hiện tại)
      const tutorLCList = await LearningCommitment.find({
         tutor: { $in: tutorIds },
         student: { $ne: student._id }, // Chỉ lấy commitments với học sinh khác
         status: "active",
      }).select("_id");

      const tutorLCIds = tutorLCList.map((t) => t._id);

      // Lấy các session với trạng thái SCHEDULED hoặc CONFIRMED
      const tutorSessions = await Session.find({
         learningCommitmentId: { $in: tutorLCIds },
         status: { $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED] },
         isDeleted: { $ne: true },
      })
         .select("startTime endTime status learningCommitmentId")
         .populate({
            path: "learningCommitmentId",
            select: "teachingRequest tutor student",
            populate: [
               {
                  path: "tutor",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email",
                  },
               },
               {
                  path: "student",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email",
                  },
               },
            ],
         });

      // 2. Lấy các suggestion schedules đang pending của gia sư với học sinh khác
      // Lấy tất cả teaching requests của các gia sư này với học sinh khác
      const otherTeachingRequests = await TeachingRequest.find({
         tutorId: { $in: tutorIds },
         studentId: { $ne: student._id }, // Chỉ lấy với học sinh khác
      }).select("_id");

      const otherTeachingRequestIds = otherTeachingRequests.map((tr) => tr._id);

      let tutorBusySchedules: any[] = [];
      if (otherTeachingRequestIds.length > 0) {
         // Lấy suggestion mới nhất của mỗi teaching request có status PENDING
         const latestSuggestionsPromises = otherTeachingRequestIds.map((trId) =>
            suggestSchedulesModel
               .findOne({
                  teachingRequestId: trId,
                  "studentResponse.status": "PENDING", // Chỉ lấy những suggestion đang pending
               })
               .select("schedules teachingRequestId tutorId")
               .populate({
                  path: "teachingRequestId",
                  select: "tutorId studentId",
                  populate: [
                     {
                        path: "tutorId",
                        select: "userId",
                        populate: {
                           path: "userId",
                           select: "_id name avatarUrl email",
                        },
                     },
                     {
                        path: "studentId",
                        select: "userId",
                        populate: {
                           path: "userId",
                           select: "_id name avatarUrl email",
                        },
                     },
                  ],
               })
               .sort({ createdAt: -1 }) // Lấy suggestion mới nhất
               .limit(1)
         );

         const latestSuggestionsResults = await Promise.all(
            latestSuggestionsPromises
         );
         const otherSuggestions = latestSuggestionsResults.filter(Boolean); // Loại bỏ null/undefined

         // Chuyển đổi format để dễ sử dụng - chuyển schedules thành format giống session
         tutorBusySchedules = otherSuggestions.flatMap((suggestion: any) => {
            if (!suggestion.schedules || suggestion.schedules.length === 0) {
               return [];
            }
            return suggestion.schedules.map((schedule: any) => ({
               startTime: schedule.start,
               endTime: schedule.end,
               status: "PENDING_SUGGESTION", // Đánh dấu là từ suggestion pending
               type: "suggestion",
               tutor: suggestion.teachingRequestId?.tutorId?.userId || null,
               student: suggestion.teachingRequestId?.studentId?.userId || null,
               teachingRequestId: suggestion.teachingRequestId?._id || null,
            }));
         });
      }

      // Merge sessions và suggestion schedules lại với nhau
      const allBusyTimes = [
         ...tutorSessions.map((session: any) => ({
            startTime: session.startTime,
            endTime: session.endTime,
            status: session.status,
            type: "session",
            learningCommitmentId: session.learningCommitmentId?._id || null,
            tutor: session.learningCommitmentId?.tutor?.userId || null,
            student: session.learningCommitmentId?.student?.userId || null,
         })),
         ...tutorBusySchedules,
      ];

      console.log(
         "tutorSessions:",
         tutorSessions.length,
         "tutorBusySchedules:",
         tutorBusySchedules.length
      );
      return allBusyTimes;
   }
}

export default new SessionService();
