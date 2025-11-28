import LearningCommitment, {
   ILearningCommitment,
   CancellationStatus,
   IAdminDisputeLog,
} from "../models/learningCommitment.model";
import Session from "../models/session.model";
import { SessionStatus } from "../types/enums/session.enum";
import { Types } from "mongoose";

export class AdminLearningService {
   private snapshotDecision(
      decision?: ILearningCommitment["cancellationDecision"]
   ) {
      if (!decision) return undefined;
      return {
         student: { ...decision.student },
         tutor: { ...decision.tutor },
         requestedBy: decision.requestedBy,
         requestedAt: decision.requestedAt,
         reason: decision.reason,
         adminReviewRequired: decision.adminReviewRequired,
         adminResolvedBy: decision.adminResolvedBy,
         adminResolvedAt: decision.adminResolvedAt,
         adminNotes: decision.adminNotes,
      };
   }

   private appendAdminDisputeLog(
      commitment: ILearningCommitment,
      log: {
         action: IAdminDisputeLog["action"];
         adminId: string;
         notes?: string;
      }
   ) {
      if (!commitment.adminDisputeLogs) {
         commitment.adminDisputeLogs = [];
      }

      commitment.adminDisputeLogs.push({
         action: log.action,
         admin: new Types.ObjectId(log.adminId),
         notes: log.notes,
         handledAt: new Date(),
         statusAfter: commitment.status,
         cancellationDecisionSnapshot: this.snapshotDecision(
            commitment.cancellationDecision
         ),
      });
   }

   // List all learning commitments with filters
   async listLearningCommitments(filters?: {
      status?: string;
      tutorId?: string;
      studentId?: string;
      page?: number;
      limit?: number;
   }) {
      const page = filters?.page || 1;
      const limit = filters?.limit || 10;
      const skip = (page - 1) * limit;

      const query: any = {};
      if (filters?.status) query.status = filters.status;
      if (filters?.tutorId) query.tutor = new Types.ObjectId(filters.tutorId);
      if (filters?.studentId)
         query.student = new Types.ObjectId(filters.studentId);

      const commitments = await LearningCommitment.find(query)
         .populate({
            path: "tutor",
            populate: { path: "userId", select: "name email" },
         })
         .populate({
            path: "student",
            populate: { path: "userId", select: "name email" },
         })
         .populate("teachingRequest")
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limit);

      const total = await LearningCommitment.countDocuments(query);

      return {
         data: commitments,
         pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get detail of a learning commitment
   async getLearningCommitmentDetail(commitmentId: string) {
      const commitment = await LearningCommitment.findById(commitmentId)
         .populate({
            path: "tutor",
            populate: { path: "userId", select: "name email phone" },
         })
         .populate({
            path: "student",
            populate: { path: "userId", select: "name email phone" },
         })
         .populate("teachingRequest")
         .lean();

      if (!commitment) {
         throw new Error("Learning commitment not found");
      }

      // Get all sessions for this commitment
      const sessions = await Session.find({
         learningCommitmentId: commitmentId,
      })
         .select(
            "startTime endTime status absence attendanceConfirmation isTrial"
         )
         .lean();

      // Calculate absence statistics
      const absenceStats = {
         totalSessions: sessions.length,
         studentAbsent: 0,
         tutorAbsent: 0,
         sessionDetails: [] as any[],
      };

      sessions.forEach((session) => {
         const sessionDetail: any = {
            _id: session._id,
            startTime: session.startTime,
            endTime: session.endTime,
            status: session.status,
            isTrial: session.isTrial,
            studentAbsent: false,
            tutorAbsent: false,
         };

         if (session.absence) {
            if (session.absence.studentAbsent) {
               absenceStats.studentAbsent++;
               sessionDetail.studentAbsent = true;
            }
            if (session.absence.tutorAbsent) {
               absenceStats.tutorAbsent++;
               sessionDetail.tutorAbsent = true;
            }
            sessionDetail.absenceReason = session.absence.reason;
         }

         absenceStats.sessionDetails.push(sessionDetail);
      });

      return {
         ...commitment,
         absenceStats,
      };
   }

   // Handle cancellation when both parties don't agree
   async handleCancellationDisagreement(
      commitmentId: string,
      adminId: string,
      adminNotes: string
   ) {
      const commitment = await LearningCommitment.findById(commitmentId);

      if (!commitment) {
         throw new Error("Learning commitment not found");
      }

      // Check if there's a disagreement
      if (!commitment.cancellationDecision) {
         throw new Error("No cancellation request found");
      }

      const { student, tutor } = commitment.cancellationDecision;

      // If statuses are different = disagreement
      if (student.status !== tutor.status) {
         // Save current decision to history
         if (!commitment.cancellationDecisionHistory) {
            commitment.cancellationDecisionHistory = [];
         }

         commitment.cancellationDecisionHistory.push({
            student: student || { status: CancellationStatus.PENDING },
            tutor: tutor || { status: CancellationStatus.PENDING },
            requestedBy: commitment.cancellationDecision.requestedBy,
            requestedAt: commitment.cancellationDecision.requestedAt,
            reason: commitment.cancellationDecision.reason,
            adminReviewRequired:
               commitment.cancellationDecision.adminReviewRequired,
            adminResolvedBy: commitment.cancellationDecision.adminResolvedBy,
            adminResolvedAt: commitment.cancellationDecision.adminResolvedAt,
            adminNotes: commitment.cancellationDecision.adminNotes,
            resolvedDate: new Date(),
         });

         // Admin resolves the disagreement
         commitment.cancellationDecision = {
            ...commitment.cancellationDecision,
            adminReviewRequired: false,
            adminResolvedBy: new Types.ObjectId(adminId),
            adminResolvedAt: new Date(),
            adminNotes,
            student: {
               ...student,
               status: CancellationStatus.ACCEPTED, // Admin accepts cancellation
            },
            tutor: {
               ...tutor,
               status: CancellationStatus.ACCEPTED,
            },
         };

         commitment.status = "cancelled";

         this.appendAdminDisputeLog(commitment, {
            action: "resolve_disagreement",
            adminId,
            notes: adminNotes,
         });

         await commitment.save();

         return {
            message: "Cancellation disagreement resolved",
            commitment,
         };
      }

      throw new Error("No disagreement found between parties");
   }

   // Get learning commitments with disagreements
   async getDisagreementCases(page: number = 1, limit: number = 10) {
      const skip = (page - 1) * limit;

      const cases = await LearningCommitment.find({
         status: "admin_review",
         "cancellationDecision.adminReviewRequired": true,
      })
         .populate({
            path: "tutor",
            populate: { path: "userId", select: "name email" },
         })
         .populate({
            path: "student",
            populate: { path: "userId", select: "name email" },
         })
         .populate("cancellationDecision.adminResolvedBy", "name")
         .sort({ "cancellationDecision.requestedAt": -1 })
         .skip(skip)
         .limit(limit);

      const total = await LearningCommitment.countDocuments({
         status: "admin_review",
         "cancellationDecision.adminReviewRequired": true,
      });

      // Enhance cases with absence statistics
      const enhancedCases = await Promise.all(
         cases.map(async (commitment) => {
            const sessions = await Session.find({
               learningCommitmentId: commitment._id,
            }).lean();

            const absenceStats = {
               totalSessions: sessions.length,
               studentAbsent: 0,
               tutorAbsent: 0,
            };

            sessions.forEach((session) => {
               if (session.absence) {
                  if (session.absence.studentAbsent) {
                     absenceStats.studentAbsent++;
                  }
                  if (session.absence.tutorAbsent) {
                     absenceStats.tutorAbsent++;
                  }
               }
            });

            return {
               ...commitment.toObject(),
               absenceStats,
            };
         })
      );

      return {
         data: enhancedCases,
         pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get learning commitments that have been resolved (have dispute logs)
   async getResolvedCases(page: number = 1, limit: number = 10) {
      const skip = (page - 1) * limit;

      const query = {
         adminDisputeLogs: { $exists: true, $ne: [] },
      };

      const commitments = await LearningCommitment.find(query)
         .populate({
            path: "tutor",
            populate: { path: "userId", select: "name email" },
         })
         .populate({
            path: "student",
            populate: { path: "userId", select: "name email" },
         })
         .populate("adminDisputeLogs.admin", "name email")
         .populate("teachingRequest")
         .lean();

      const flattenedLogs =
         commitments.flatMap((commitment) =>
            (commitment.adminDisputeLogs || []).map((log) => ({
               commitmentId: commitment._id,
               student: commitment.student,
               tutor: commitment.tutor,
               teachingRequest: commitment.teachingRequest,
               action: log.action,
               statusAfter: log.statusAfter,
               adminNotes: log.notes,
               handledAt: log.handledAt,
               handledBy: log.admin,
               cancellationDecisionSnapshot: log.cancellationDecisionSnapshot,
               logId: log._id,
            }))
         ) || [];

      flattenedLogs.sort((a, b) => {
         const timeA = a.handledAt ? new Date(a.handledAt).getTime() : 0;
         const timeB = b.handledAt ? new Date(b.handledAt).getTime() : 0;
         return timeB - timeA;
      });

      const totalLogs = flattenedLogs.length;
      const paginatedLogs = flattenedLogs.slice(skip, skip + limit);

      return {
         data: paginatedLogs,
         pagination: {
            total: totalLogs,
            page,
            limit,
            pages: Math.ceil(totalLogs / limit) || 0,
         },
      };
   }

   // Approve cancellation request
   async approveCancellation(
      commitmentId: string,
      adminId: string,
      adminNotes?: string
   ) {
      const commitment = await LearningCommitment.findById(commitmentId);

      if (!commitment) {
         throw new Error("Learning commitment not found");
      }

      // Save to history
      if (!commitment.cancellationDecisionHistory) {
         commitment.cancellationDecisionHistory = [];
      }

      if (commitment.cancellationDecision) {
         commitment.cancellationDecisionHistory.push({
            student: commitment.cancellationDecision.student || {
               status: CancellationStatus.PENDING,
            },
            tutor: commitment.cancellationDecision.tutor || {
               status: CancellationStatus.PENDING,
            },
            requestedBy: commitment.cancellationDecision.requestedBy,
            requestedAt: commitment.cancellationDecision.requestedAt,
            reason: commitment.cancellationDecision.reason,
            adminReviewRequired:
               commitment.cancellationDecision.adminReviewRequired,
            adminResolvedBy: commitment.cancellationDecision.adminResolvedBy,
            adminResolvedAt: commitment.cancellationDecision.adminResolvedAt,
            adminNotes: commitment.cancellationDecision.adminNotes,
            resolvedDate: new Date(),
         });
      }

      // Update cancellation decision
      commitment.cancellationDecision = {
         ...commitment.cancellationDecision,
         student: {
            ...commitment.cancellationDecision?.student!,
            status: CancellationStatus.ACCEPTED,
         },
         tutor: {
            ...commitment.cancellationDecision?.tutor!,
            status: CancellationStatus.ACCEPTED,
         },
         adminReviewRequired: false,
         adminResolvedBy: new Types.ObjectId(adminId),
         adminResolvedAt: new Date(),
         adminNotes,
      };

      commitment.status = "cancelled";
      this.appendAdminDisputeLog(commitment, {
         action: "approve_cancellation",
         adminId,
         notes: adminNotes,
      });
      await commitment.save();

      // Handle related sessions
      await this.handleSessionsOnCommitmentCancellation(commitmentId);

      return {
         message: "Cancellation approved",
         commitment,
      };
   }

   // New method to handle sessions when commitment is cancelled
   private async handleSessionsOnCommitmentCancellation(commitmentId: string) {
      const sessions = await Session.find({
         learningCommitmentId: commitmentId,
         isDeleted: { $ne: true },
         status: {
            $nin: [
               SessionStatus.COMPLETED,
               SessionStatus.CANCELLED,
               SessionStatus.NOT_CONDUCTED,
            ],
         },
      });

      const now = new Date();

      for (const session of sessions) {
         // If student hasn't confirmed participation yet → REJECT
         if (
            session.studentConfirmation?.status === "PENDING" ||
            !session.studentConfirmation
         ) {
            session.status = SessionStatus.REJECTED;
            session.studentConfirmation = {
               status: "REJECTED",
               confirmedAt: now,
            };
            session.isDeleted = true;
            session.deletedAt = now;
         }
         // If student confirmed and session hasn't started → CANCEL
         else if (
            session.studentConfirmation?.status === "ACCEPTED" &&
            session.status === SessionStatus.CONFIRMED &&
            now < session.startTime
         ) {
            session.status = SessionStatus.CANCELLED;
            session.cancellation = {
               cancelledBy: new Types.ObjectId(), // System cancellation
               reason: "Learning commitment was cancelled",
               cancelledAt: now,
            };
         }

         await session.save();
      }
   }

   // Reject cancellation request
   async rejectCancellation(
      commitmentId: string,
      adminId: string,
      adminNotes?: string
   ) {
      const commitment = await LearningCommitment.findById(commitmentId);

      if (!commitment) {
         throw new Error("Learning commitment not found");
      }

      // Save to history
      if (!commitment.cancellationDecisionHistory) {
         commitment.cancellationDecisionHistory = [];
      }

      if (commitment.cancellationDecision) {
         commitment.cancellationDecisionHistory.push({
            student: commitment.cancellationDecision.student || {
               status: CancellationStatus.PENDING,
            },
            tutor: commitment.cancellationDecision.tutor || {
               status: CancellationStatus.PENDING,
            },
            requestedBy: commitment.cancellationDecision.requestedBy,
            requestedAt: commitment.cancellationDecision.requestedAt,
            reason: commitment.cancellationDecision.reason,
            adminReviewRequired:
               commitment.cancellationDecision.adminReviewRequired,
            adminResolvedBy: commitment.cancellationDecision.adminResolvedBy,
            adminResolvedAt: commitment.cancellationDecision.adminResolvedAt,
            adminNotes: commitment.cancellationDecision.adminNotes,
            resolvedDate: new Date(),
         });
      }

      // Append dispute log TRƯỚC khi reset (để lưu dữ liệu cũ)
      this.appendAdminDisputeLog(commitment, {
         action: "reject_cancellation",
         adminId,
         notes: adminNotes,
      });

      // AFTER: Reset both student and tutor decisions to PENDING
      commitment.cancellationDecision = {
         student: {
            status: CancellationStatus.PENDING,
         },
         tutor: {
            status: CancellationStatus.PENDING,
         },
         requestedBy: undefined,
         requestedAt: undefined,
         reason: undefined,
         adminReviewRequired: false,
         adminResolvedBy: new Types.ObjectId(adminId),
         adminResolvedAt: new Date(),
         adminNotes,
      };

      commitment.status = "active";
      await commitment.save();

      return {
         message: "Cancellation rejected",
         commitment,
      };
   }
}
