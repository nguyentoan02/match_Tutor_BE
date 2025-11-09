import LearningCommitment, {
   CancellationStatus,
   ILearningCommitment,
} from "../models/learningCommitment.model";
import { BadRequestError, UnauthorizedError } from "../utils/error.response";
import * as paymentService from "./payment.service";
import TeachingRequest from "../models/teachingRequest.model";
import Student from "../models/student.model";
import Tutor from "../models/tutor.model";
import Wallet from "../models/wallet.model";
import AdminWallet from "../models/adminWallet.model";
import Session from "../models/session.model";
import { SessionStatus } from "../types/enums/session.enum";
import mongoose from "mongoose";

export const createLearningCommitment = async (data: {
   tutor: string;
   teachingRequest: string;
   totalSessions: number;
   startDate: Date;
   endDate: Date;
   totalAmount: number;
}) => {
   // Lấy teaching request để get studentId
   const teachingRequest = await TeachingRequest.findById(data.teachingRequest);
   if (!teachingRequest) throw new Error("Teaching request not found");

   // Validate endDate phải nhỏ hơn hoặc bằng 2 tháng tính từ startDate
   const startDate = new Date(data.startDate);
   const endDate = new Date(data.endDate);
   const twoMonthsLater = new Date(startDate);
   twoMonthsLater.setMonth(twoMonthsLater.getMonth() + 2);

   if (endDate > twoMonthsLater) {
      throw new BadRequestError(
         `End date must be within 2 months from start date. Start date: ${startDate.toISOString()}, Max end date: ${twoMonthsLater.toISOString()}`
      );
   }

   if (endDate < startDate) {
      throw new BadRequestError(
         "End date must be greater than or equal to start date"
      );
   }

   const commitment = new LearningCommitment({
      ...data,
      tutor: teachingRequest.tutorId,
      student: teachingRequest.studentId,
      status: "pending_agreement",
      studentPaidAmount: 0,
      completedSessions: 0,
   });
   await commitment.save();
   return commitment;
};

export const getLearningCommitment = async (id: string, userId: string) => {
   const commitment = await LearningCommitment.findById(id).populate(
      "tutor student teachingRequest"
   );
   if (!commitment) throw new Error("Learning commitment not found");
   // Kiểm tra quyền: chỉ tutor hoặc student của commitment
   if (
      commitment.tutor.toString() !== userId &&
      commitment.student.toString() !== userId
   ) {
      throw new Error("Unauthorized");
   }
   return commitment;
};

export const initiatePayment = async (id: string, userId: string) => {
   const studentProfile = (await Student.findOne({ userId }).select("_id")) as {
      _id: string;
   };
   if (!studentProfile) throw new Error("Student profile not found");

   const commitment = await LearningCommitment.findById(id);
   if (!commitment) throw new Error("Learning commitment not found");

   if (commitment.student.toString() !== studentProfile._id.toString())
      throw new Error("Only student can initiate payment");

   if (commitment.status !== "pending_agreement")
      throw new Error("Commitment not in pending state");

   if (commitment.studentPaidAmount > 0)
      throw new Error("Payment already initiated or partial");

   // Tạo payment record
   const payment = await paymentService.createLearningCommitmentPayment(
      String(commitment._id),
      userId,
      commitment.totalAmount
   );
   return payment.paymentLink;
};

export const requestCancellation = async (
   commitmentId: string,
   userId: string,
   role: "student" | "tutor",
   reason: string
) => {
   const commitment = await LearningCommitment.findById(commitmentId);
   if (!commitment) throw new BadRequestError("Learning commitment not found");

   // Xác định vai trò của người dùng trong commitment
   const studentProfile = (await Student.findOne({ userId }).select("_id")) as {
      _id: string;
   };
   const isStudent =
      studentProfile &&
      commitment.student.toString() === studentProfile._id.toString();
   const tutorProfile = (await Tutor.findOne({ userId }).select("_id")) as {
      _id: string;
   };
   const isTutor =
      tutorProfile &&
      commitment.tutor.toString() === tutorProfile._id.toString();

   if (!isStudent && !isTutor) {
      throw new UnauthorizedError(
         "User is not part of this learning commitment"
      );
   }

   // Chỉ cho phép hủy khi ở trạng thái active hoặc cancellation_pending
   if (
      commitment.status !== "active" &&
      commitment.status !== "cancellation_pending"
   ) {
      throw new BadRequestError(
         `Cannot cancel commitment with status: ${commitment.status}. Only active or pending cancellation commitments can be cancelled.`
      );
   }

   const userRole = isStudent ? "student" : "tutor";
   const otherRole = isStudent ? "tutor" : "student";

   // Khởi tạo hoặc cập nhật yêu cầu hủy
   if (!commitment.cancellationDecision?.requestedBy) {
      // Lần đầu yêu cầu hủy
      commitment.status = "cancellation_pending";
      commitment.cancellationDecision = {
         requestedBy: userRole,
         requestedAt: new Date(),
         reason: reason,
         student: { status: CancellationStatus.PENDING },
         tutor: { status: CancellationStatus.PENDING },
      };
      commitment.cancellationDecision[userRole].status =
         CancellationStatus.ACCEPTED;
      commitment.cancellationDecision[userRole].reason = reason;
   } else {
      // Người còn lại phản hồi
      if (
         commitment.cancellationDecision[userRole].status !==
         CancellationStatus.PENDING
      ) {
         throw new BadRequestError(
            "You have already responded to this cancellation request."
         );
      }
      commitment.cancellationDecision[userRole].status =
         CancellationStatus.ACCEPTED;
      commitment.cancellationDecision[userRole].reason = reason;
   }

   // Kiểm tra kết quả
   const studentDecision = commitment.cancellationDecision.student.status;
   const tutorDecision = commitment.cancellationDecision.tutor.status;

   if (
      studentDecision === CancellationStatus.ACCEPTED &&
      tutorDecision === CancellationStatus.ACCEPTED
   ) {
      // Cả hai đồng ý -> Hủy
      commitment.status = "cancelled";

      // Cancel all upcoming sessions
      await Session.updateMany(
         {
            learningCommitmentId: commitmentId,
            status: { $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED] },
         },
         {
            status: SessionStatus.CANCELLED,
            cancellation: {
               reason: "Learning commitment cancelled",
               cancelledAt: new Date(),
            },
         }
      );

      // Lưu vào lịch sử
      if (commitment.cancellationDecision) {
         commitment.cancellationDecisionHistory?.push({
            ...commitment.cancellationDecision,
            resolvedDate: new Date(),
         });
         commitment.cancellationDecision = undefined;
      }
   }

   await commitment.save();
   return commitment;
};

export const rejectCancellation = async (
   commitmentId: string,
   userId: string,
   role: "student" | "tutor",
   reason: string
) => {
   const commitment = await LearningCommitment.findById(commitmentId);
   if (!commitment) throw new BadRequestError("Learning commitment not found");

   if (commitment.status !== "cancellation_pending") {
      throw new BadRequestError("No active cancellation request to reject.");
   }

   const studentProfile = (await Student.findOne({ userId }).select("_id")) as {
      _id: string;
   };
   const isStudent =
      studentProfile &&
      commitment.student.toString() === studentProfile._id.toString();
   const tutorProfile = (await Tutor.findOne({ userId }).select("_id")) as {
      _id: string;
   };
   const isTutor =
      tutorProfile &&
      commitment.tutor.toString() === tutorProfile._id.toString();

   if (!isStudent && !isTutor) {
      throw new UnauthorizedError(
         "User is not part of this learning commitment"
      );
   }

   const userRole = isStudent ? "student" : "tutor";

   if (
      commitment.cancellationDecision?.[userRole].status !==
      CancellationStatus.PENDING
   ) {
      throw new BadRequestError("You cannot reject this request.");
   }

   // Cập nhật quyết định từ chối
   commitment.cancellationDecision[userRole].status =
      CancellationStatus.REJECTED;
   commitment.cancellationDecision[userRole].reason = reason;

   // Chuyển cho admin xử lý
   commitment.status = "admin_review";
   commitment.cancellationDecision.adminReviewRequired = true;

   await commitment.save();
   return commitment;
};

export const rejectLearningCommitment = async (
   commitmentId: string,
   userId: string
) => {
   const commitment = await LearningCommitment.findById(commitmentId);
   if (!commitment) throw new BadRequestError("Learning commitment not found");

   // Chỉ có thể từ chối khi ở trạng thái pending_agreement
   if (commitment.status !== "pending_agreement") {
      throw new BadRequestError(
         `Cannot reject commitment with status: ${commitment.status}. Only pending agreements can be rejected.`
      );
   }

   const studentProfile = (await Student.findOne({ userId }).select("_id")) as {
      _id: string;
   };
   const isStudent =
      studentProfile &&
      commitment.student.toString() === studentProfile._id.toString();

   const tutorProfile = (await Tutor.findOne({ userId }).select("_id")) as {
      _id: string;
   };
   const isTutor =
      tutorProfile &&
      commitment.tutor.toString() === tutorProfile._id.toString();

   if (!isStudent && !isTutor) {
      throw new UnauthorizedError(
         "User is not part of this learning commitment"
      );
   }

   commitment.status = "rejected";
   await commitment.save();
   return commitment;
};

async function processMoneyTransfer(commitment: ILearningCommitment) {
   // Double check to ensure we don't process again
   if (commitment.isMoneyTransferred) {
      return;
   }

   const session = await mongoose.startSession();
   session.startTransaction();
   try {
      const {
         status,
         student,
         tutor,
         studentPaidAmount,
         cancellationDecisionHistory,
         totalSessions,
         completedSessions,
      } = commitment;

      // Populate student and tutor if they are ObjectIds
      await commitment.populate([{ path: "student" }, { path: "tutor" }]);

      // Lấy userId từ Tutor và Student profile
      const tutorUserId = (commitment.tutor as any).userId;
      const studentUserId = (commitment.student as any).userId;

      if (!tutorUserId || !studentUserId) {
         throw new Error(
            `User IDs not found for tutor or student in commitment ${commitment._id}`
         );
      }

      const tutorWallet = await Wallet.findOne({
         userId: tutorUserId,
      }).session(session);
      const studentWallet = await Wallet.findOne({
         userId: studentUserId,
      }).session(session);
      let adminWallet = await AdminWallet.findOne({}).session(session);

      if (!tutorWallet || !studentWallet) {
         throw new Error(
            `Wallet not found for student or tutor in commitment ${commitment._id}`
         );
      }

      if (!adminWallet) {
         adminWallet = await new AdminWallet({ balance: 0 }).save({ session });
      }

      if (status === "completed") {
         // Hoàn thành: 90% cho gia sư, 10% cho admin
         const amountForTutor = studentPaidAmount * 0.9;
         const amountForAdmin = studentPaidAmount * 0.1;

         tutorWallet.balance += amountForTutor;
         adminWallet.balance += amountForAdmin;

         await tutorWallet.save({ session });
         await adminWallet.save({ session });
      } else if (status === "cancelled") {
         if (totalSessions === 0) {
            await session.abortTransaction();
            return;
         }

         const lastCancellation =
            cancellationDecisionHistory?.[
               cancellationDecisionHistory.length - 1
            ];
         const cancelledByTutor = lastCancellation?.requestedBy === "tutor";
         const pricePerSession = studentPaidAmount / totalSessions;

         const amountForTaughtSessions = completedSessions * pricePerSession;
         const amountForUntrainedSessions =
            studentPaidAmount - amountForTaughtSessions;

         if (cancelledByTutor) {
            // Gia sư huỷ: 90% tiền buổi hoàn thành cho gia sư, 10% cho admin, tiền buổi chưa học cho học sinh
            const tutorAmount = amountForTaughtSessions * 0.9;
            const adminAmountFromTaught = amountForTaughtSessions * 0.1;

            if (tutorAmount > 0) {
               tutorWallet.balance += tutorAmount;
            }
            if (adminAmountFromTaught > 0) {
               adminWallet.balance += adminAmountFromTaught;
            }
            if (amountForUntrainedSessions > 0) {
               studentWallet.balance += amountForUntrainedSessions;
            }
         } else {
            // Học sinh huỷ: tiền buổi hoàn thành 90% cho gia sư 10% cho admin, tiền buổi chưa học về admin
            const tutorAmount = amountForTaughtSessions * 0.9;
            const adminAmountFromTaught = amountForTaughtSessions * 0.1;

            if (tutorAmount > 0) {
               tutorWallet.balance += tutorAmount;
            }
            if (adminAmountFromTaught > 0) {
               adminWallet.balance += adminAmountFromTaught;
            }
            if (amountForUntrainedSessions > 0) {
               adminWallet.balance += amountForUntrainedSessions;
            }
         }

         await tutorWallet.save({ session });
         await studentWallet.save({ session });
         await adminWallet.save({ session });
      }

      commitment.isMoneyTransferred = true;
      await commitment.save({ session });

      await session.commitTransaction();
   } catch (error) {
      await session.abortTransaction();
      console.error(
         `Failed to process money transfer for commitment ${commitment._id}:`,
         error
      );
   } finally {
      session.endSession();
   }
}

export async function listLearningCommitments(opts: {
   userId?: string;
   tutorId?: string | null;
   page?: number;
   limit?: number;
   role?: string;
}) {
   const { userId, page = 1, limit = 10 } = opts;
   const filter: any = {};

   if (userId) {
      const studentProfile = await Student.findOne({ userId }).select("_id");
      const tutorProfile = await Tutor.findOne({ userId }).select("_id");

      const conditions = [];
      if (studentProfile) {
         conditions.push({ student: studentProfile._id });
      }
      if (tutorProfile) {
         conditions.push({ tutor: tutorProfile._id });
      }

      if (conditions.length > 0) {
         filter.$or = conditions;
      } else {
         return { items: [], total: 0, page, limit, pages: 0 };
      }
   }

   const skip = (page - 1) * limit;

   const [items, total] = await Promise.all([
      LearningCommitment.find(filter)
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
         .limit(limit),
      LearningCommitment.countDocuments(filter),
   ]);

   const commitmentsToProcess = items.filter(
      (item) =>
         (item.status === "completed" || item.status === "cancelled") &&
         !item.isMoneyTransferred
   );

   if (commitmentsToProcess.length > 0) {
      Promise.all(commitmentsToProcess.map(processMoneyTransfer)).catch(
         (err) => {
            console.error(
               "Error during background money transfer processing:",
               err
            );
         }
      );
   }

   return {
      items: items.map((item) => item.toObject()),
      total,
      page,
      limit,
      pages: Math.ceil(total / limit) || 0,
   };
}

export async function getActiveLearningCommitmentsByTutor(userId: string) {
   const tutorProfile = await Tutor.findOne({ userId }).select("_id");
   if (!tutorProfile) {
      throw new UnauthorizedError("User is not a tutor");
   }

   const commitments = await LearningCommitment.find({
      tutor: tutorProfile._id,
      status: "active",
   })
      .populate({
         path: "student",
         populate: { path: "userId", select: "name email avatarUrl" },
      })
      .populate({
         path: "tutor",
         populate: { path: "userId", select: "name email avatarUrl" },
      })
      .populate("teachingRequest")
      .sort({ createdAt: -1 })
      .lean();

   return commitments;
}
