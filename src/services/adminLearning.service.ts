import LearningCommitment, {
   ILearningCommitment,
   CancellationStatus,
} from "../models/learningCommitment.model";
import Session from "../models/session.model";
import { Types } from "mongoose";

export class AdminLearningService {
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
         .populate("tutor", "name email")
         .populate("student", "name email")
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
         .populate("tutor", "name email phone")
         .populate("student", "name email phone")
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
         .populate("tutor", "name email")
         .populate("student", "name email")
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
      await commitment.save();

      return {
         message: "Cancellation approved",
         commitment,
      };
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

      // Reset cancellation decision
      commitment.cancellationDecision = {
         student: { status: CancellationStatus.PENDING },
         tutor: { status: CancellationStatus.PENDING },
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
