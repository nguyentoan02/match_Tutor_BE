import Session from "../models/session.model";
import LearningCommitment from "../models/learningCommitment.model";
import { NotFoundError, BadRequestError } from "../utils/error.response";
import { SessionStatus } from "../types/enums/session.enum";
import mongoose from "mongoose";
import moment from "moment-timezone"; // <--- added import

class AdminSessionService {
   // Copy of logic in SessionService.extendCommitmentForAbsences
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
}

export default new AdminSessionService();
