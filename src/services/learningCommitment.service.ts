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
   sessionsPerWeek: number;
   startDate: Date;
   totalAmount: number;
}) => {
   // Lấy teaching request để get studentId
   const teachingRequest = await TeachingRequest.findById(data.teachingRequest);
   if (!teachingRequest) throw new Error("Không tìm thấy yêu cầu dạy học");

   // Kiểm tra xem tutor và student có active commitment nào không
   const existingActiveCommitment = await LearningCommitment.findOne({
      tutor: teachingRequest.tutorId,
      student: teachingRequest.studentId,
      status: {
         $in: [
            "pending_agreement",
            "active",
            "cancellation_pending",
            "admin_review",
         ],
      },
   });

   if (existingActiveCommitment) {
      throw new BadRequestError(
         "Gia sư và học sinh đã có một cam kết học tập đang hoạt động. Vui lòng chờ cho đến khi nó được hoàn thành hoặc hủy bỏ trước khi tạo một cam kết mới."
      );
   }

   // Validate startDate không được nhỏ hơn ngày hiện tại
   const currentDate = new Date();
   const startDate = new Date(data.startDate);
   if (startDate < currentDate) {
      throw new BadRequestError(
         "Ngày bắt đầu không được ở quá khứ. Ngày hiện tại: " +
            currentDate.toISOString() +
            ", Ngày bắt đầu: " +
            startDate.toISOString()
      );
   }

   // Validate sessionsPerWeek
   const { totalSessions, sessionsPerWeek } = data;
   if (!sessionsPerWeek || sessionsPerWeek <= 0) {
      throw new BadRequestError("Số buổi mỗi tuần phải lớn hơn 0");
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
   if (!commitment) throw new Error("Không tìm thấy cam kết học tập");
   // Kiểm tra quyền: chỉ tutor hoặc student của commitment
   if (
      commitment.tutor.toString() !== userId &&
      commitment.student.toString() !== userId
   ) {
      throw new Error("Không có quyền truy cập");
   }
   return commitment;
};

export const initiatePayment = async (id: string, userId: string) => {
   const studentProfile = (await Student.findOne({ userId }).select("_id")) as {
      _id: string;
   };
   if (!studentProfile) throw new Error("Không tìm thấy hồ sơ học sinh");

   const commitment = await LearningCommitment.findById(id);
   if (!commitment) throw new Error("Không tìm thấy cam kết học tập");

   if (commitment.student.toString() !== studentProfile._id.toString())
      throw new Error("Chỉ học sinh mới có thể khởi tạo thanh toán");

   if (commitment.status !== "pending_agreement")
      throw new Error("Cam kết không ở trạng thái chờ xử lý");

   if (commitment.studentPaidAmount > 0)
      throw new Error("Thanh toán đã được khởi tạo hoặc thanh toán một phần");

   // Validate totalAmount
   const totalAmount = Number(commitment.totalAmount);
   if (!totalAmount || totalAmount <= 0 || !Number.isInteger(totalAmount)) {
      throw new BadRequestError(
         `Số tiền không hợp lệ. Số tiền phải là một số nguyên lớn hơn 0. Giá trị hiện tại: ${commitment.totalAmount}`
      );
   }

   // Tạo payment record
   const payment = await paymentService.createLearningCommitmentPayment(
      String(commitment._id),
      userId,
      totalAmount
   );
   return payment.paymentLink;
};

export const requestCancellation = async (
   commitmentId: string,
   userId: string,
   role: "student" | "tutor",
   reason: string,
   linkUrl?: string
) => {
   const commitment = await LearningCommitment.findById(commitmentId);
   if (!commitment) throw new BadRequestError("Không tìm thấy cam kết học tập");

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
         "Người dùng không phải là một phần của cam kết học tập này"
      );
   }

   // Kiểm tra xem có buổi học nào đang ở trạng thái DISPUTED không
   const disputedSession = await Session.findOne({
      learningCommitmentId: commitmentId,
      status: SessionStatus.DISPUTED,
   });

   if (disputedSession) {
      throw new BadRequestError(
         "Không thể gửi yêu cầu hủy cam kết khi có buổi học đang chờ admin xem xét (tranh chấp). Vui lòng chờ admin giải quyết tranh chấp trước."
      );
   }

   // Chỉ cho phép hủy khi ở trạng thái active hoặc cancellation_pending
   if (
      commitment.status !== "active" &&
      commitment.status !== "cancellation_pending"
   ) {
      throw new BadRequestError(
         `Không thể hủy cam kết với trạng thái: ${commitment.status}. Chỉ có thể hủy các cam kết đang hoạt động hoặc đang chờ hủy.`
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
      if (linkUrl) {
         commitment.cancellationDecision[userRole].linkUrl = linkUrl;
      }
   } else {
      // Người còn lại phản hồi
      if (
         commitment.cancellationDecision[userRole].status !==
         CancellationStatus.PENDING
      ) {
         throw new BadRequestError("Bạn đã phản hồi yêu cầu hủy này rồi.");
      }
      commitment.cancellationDecision[userRole].status =
         CancellationStatus.ACCEPTED;
      commitment.cancellationDecision[userRole].reason = reason;
      if (linkUrl) {
         commitment.cancellationDecision[userRole].linkUrl = linkUrl;
      }
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
               reason: "Cam kết học tập đã bị hủy",
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
   payload: { reason: string; linkUrl?: string }
) => {
   const commitment = await LearningCommitment.findById(commitmentId);
   if (!commitment) throw new BadRequestError("Không tìm thấy cam kết học tập");

   if (commitment.status !== "cancellation_pending") {
      throw new BadRequestError(
         "Không có yêu cầu hủy nào đang hoạt động để từ chối."
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
         "Người dùng không phải là một phần của cam kết học tập này"
      );
   }

   const userRole = isStudent ? "student" : "tutor";

   if (
      commitment.cancellationDecision?.[userRole].status !==
      CancellationStatus.PENDING
   ) {
      throw new BadRequestError("Bạn không thể từ chối yêu cầu này.");
   }

   // Cập nhật quyết định từ chối (lưu reason và optional linkUrl)
   commitment.cancellationDecision[userRole].status =
      CancellationStatus.REJECTED;
   commitment.cancellationDecision[userRole].reason = payload.reason;
   if (payload.linkUrl) {
      commitment.cancellationDecision[userRole].linkUrl = payload.linkUrl;
   }

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
   if (!commitment) throw new BadRequestError("Không tìm thấy cam kết học tập");

   // Chỉ có thể từ chối khi ở trạng thái pending_agreement
   if (commitment.status !== "pending_agreement") {
      throw new BadRequestError(
         `Không thể từ chối cam kết với trạng thái: ${commitment.status}. Chỉ có thể từ chối các cam kết đang chờ đồng ý.`
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
         "Người dùng không phải là một phần của cam kết học tập này"
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
            `Không tìm thấy User IDs cho gia sư hoặc học sinh trong cam kết ${commitment._id}`
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
            `Không tìm thấy ví cho học sinh hoặc gia sư trong cam kết ${commitment._id}`
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
            // Học sinh huỷ: tiền buổi hoàn thành 90% cho gia sư 10% cho admin
            // tiền buổi chưa học: admin 10%, gia sư 40%, học sinh 50%
            const tutorAmountFromTaught = amountForTaughtSessions * 0.9;
            const adminAmountFromTaught = amountForTaughtSessions * 0.1;

            const adminAmountFromUntrained = amountForUntrainedSessions * 0.1;
            const tutorAmountFromUntrained = amountForUntrainedSessions * 0.4;
            const studentAmountFromUntrained = amountForUntrainedSessions * 0.5;

            if (tutorAmountFromTaught > 0) {
               tutorWallet.balance += tutorAmountFromTaught;
            }
            if (adminAmountFromTaught > 0) {
               adminWallet.balance += adminAmountFromTaught;
            }
            if (tutorAmountFromUntrained > 0) {
               tutorWallet.balance += tutorAmountFromUntrained;
            }
            if (adminAmountFromUntrained > 0) {
               adminWallet.balance += adminAmountFromUntrained;
            }
            if (studentAmountFromUntrained > 0) {
               studentWallet.balance += studentAmountFromUntrained;
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
         `Không thể xử lý chuyển tiền cho cam kết ${commitment._id}:`,
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
      throw new UnauthorizedError("Người dùng không phải là một gia sư");
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

export const initiateTopUp = async (
   id: string,
   userId: string,
   additionalSessions: number,
   amount: number
) => {
   const studentProfile = (await Student.findOne({ userId }).select("_id")) as {
      _id: string;
   };
   if (!studentProfile) throw new Error("Không tìm thấy hồ sơ học sinh");

   const commitment = await LearningCommitment.findById(id);
   if (!commitment) throw new Error("Không tìm thấy cam kết học tập");

   // chỉ học sinh của cam kết mới được top-up
   if (commitment.student.toString() !== studentProfile._id.toString())
      throw new Error("Chỉ học sinh của cam kết mới có thể top-up");

   // Cho phép top-up khi commitment ở trạng thái active hoặc pending_agreement
   if (!["active", "pending_agreement"].includes(commitment.status)) {
      throw new BadRequestError(
         "Không thể top-up cho cam kết với trạng thái hiện tại."
      );
   }

   // Tạo payment top-up
   const payment = await paymentService.createTopUpPayment(
      String(commitment._id),
      userId,
      Number(amount),
      Number(additionalSessions)
   );
   return payment.paymentLink;
};
