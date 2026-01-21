import payos from "../config/payos";
import Payment from "../models/payment.model";
import LearningCommitment from "../models/learningCommitment.model";
import PaymentTemp from "../models/paymentTemp.model";
import Package from "../models/package.model";
import Tutor from "../models/tutor.model";
import Session from "../models/session.model";
import suggestSchedulesModel from "../models/suggestSchedules.model";
import { SessionStatus } from "../types/enums/session.enum";
import {
   TUTOR_CHECKIN_GRACE_MINUTES,
   STUDENT_CHECKIN_GRACE_MINUTES,
} from "../utils/sessionAuto.util";
import mongoose from "mongoose";

export const createLearningCommitmentPayment = async (
   learningCommitmentId: string,
   userId: string,
   amount: number
) => {
   // Validate amount before creating payment link
   const validatedAmount = Math.floor(Number(amount));
   if (!validatedAmount || validatedAmount <= 0) {
      throw new Error(
         `Số tiền không hợp lệ: ${amount}. Số tiền phải là một số nguyên lớn hơn 0.`
      );
   }

   const orderCode = Date.now();
   const paymentData = {
      orderCode,
      amount: validatedAmount,
      description: `Payment`,
      returnUrl: `${process.env.FRONTEND_URL}/student/learning-commitments?status=success&id=${learningCommitmentId}`,
      cancelUrl: `${process.env.FRONTEND_URL}/student/learning-commitments?status=cancelled&id=${learningCommitmentId}`,
   };

   const paymentLink = await payos.paymentRequests.create(paymentData);

   const tempPayment = new PaymentTemp({
      orderCode,
      userId,
      referenceId: learningCommitmentId,
      type: "learningCommitment",
   });
   await tempPayment.save();

   return {
      paymentLink: paymentLink.checkoutUrl,
      orderCode,
   };
};

export const createPackagePayment = async (
   userId: string,
   packageId: string,
   amount: number
) => {
   const orderCode = Date.now();
   const paymentData = {
      orderCode,
      amount,
      description: `Package payment `,
      returnUrl: `${process.env.FRONTEND_URL}/tutor/dashboard`,
      cancelUrl: `${process.env.FRONTEND_URL}/tutor/dashboard`,
   };

   const paymentLink = await payos.paymentRequests.create(paymentData);

   const tempPayment = new PaymentTemp({
      orderCode,
      userId,
      packageId,
      type: "package",
   });
   await tempPayment.save();

   return {
      paymentLink: paymentLink.checkoutUrl,
      orderCode,
   };
};

export const createTopUpPayment = async (
   learningCommitmentId: string,
   userId: string,
   amount: number,
   additionalSessions: number
) => {
   const orderCode = Date.now();
   const paymentData = {
      orderCode,
      amount,
      description: `Top-up ${additionalSessions} session(s)`,
      returnUrl: `${process.env.FRONTEND_URL}/student/learning-commitments?status=success&id=${learningCommitmentId}`,
      cancelUrl: `${process.env.FRONTEND_URL}/student/learning-commitments?status=cancelled&id=${learningCommitmentId}`,
   };

   const paymentLink = await payos.paymentRequests.create(paymentData);

   const tempPayment = new PaymentTemp({
      orderCode,
      userId,
      referenceId: learningCommitmentId,
      type: "topup",
      additionalSessions,
   });
   await tempPayment.save();

   return {
      paymentLink: paymentLink.checkoutUrl,
      orderCode,
   };
};

export const webHook = async (webhookData: { data: any }) => {
   const { data: innerData } = webhookData.data;

   // BƯỚC 1: Bỏ qua webhook test từ PayOS
   if (innerData.orderCode === 123 || innerData.orderCode === "123") {
      console.log("PayOS test webhook received, ignoring...");
      return { success: true, message: "Test webhook ignored" };
   }

   // BƯỚC 2: Chỉ xử lý khi thanh toán thành công (code === "00")
   if (webhookData.data.code === "00") {
      const tempPayment = await PaymentTemp.findOne({
         orderCode: innerData.orderCode,
      });
      if (!tempPayment) {
         throw new Error("Temp payment data not found");
      }

      // BƯỚC 3: Tạo Payment record
      const newPayment = new Payment({
         userId: tempPayment.userId,
         type: tempPayment.type,
         referenceId: tempPayment.referenceId,
         packageId: tempPayment.packageId,
         orderCode: innerData.orderCode,
         amount: innerData.amount,
         status: "SUCCESS",
         transactionId: innerData.reference,
      });
      await newPayment.save();

      // BƯỚC 4: Xử lý logic theo loại thanh toán
      if (tempPayment.type === "learningCommitment") {
         const commitment = await LearningCommitment.findById(
            tempPayment.referenceId
         ).populate({
            path: "tutor",
            select: "userId",
            populate: {
               path: "userId",
               select: "_id",
            },
         });
         if (!commitment) {
            throw new Error("LearningCommitment not found");
         }

         const wasPending = commitment.status === "pending_agreement";

         // Cập nhật số tiền đã thanh toán
         commitment.studentPaidAmount += innerData.amount;

         // Nếu đã thanh toán đủ, chuyển sang active
         if (commitment.studentPaidAmount >= commitment.totalAmount) {
            commitment.status = "active";
         }

         await commitment.save();

         // Khi commitment chuyển sang active (từ pending_agreement), tạo session từ suggestion schedules đã được accept
         if (wasPending && commitment.status === "active") {
            try {
               // Convert teachingRequestId để đảm bảo so sánh đúng ObjectId
               const teachingRequestId = commitment.teachingRequest;

               // Đảm bảo teachingRequestId là ObjectId
               const teachingRequestObjectId =
                  teachingRequestId instanceof mongoose.Types.ObjectId
                     ? teachingRequestId
                     : new mongoose.Types.ObjectId(String(teachingRequestId));

               // Tìm với điều kiện: studentResponse.status = ACCEPTED (điều kiện chính)
               // status có thể là ACCEPTED hoặc PENDING (vì có thể chưa được update)
               let acceptedSuggestion = await suggestSchedulesModel.findOne({
                  teachingRequestId: teachingRequestObjectId,
                  "studentResponse.status": "ACCEPTED",
               });

               // Nếu không tìm thấy, thử tìm với status = ACCEPTED
               if (!acceptedSuggestion) {
                  acceptedSuggestion = await suggestSchedulesModel.findOne({
                     teachingRequestId: teachingRequestObjectId,
                     status: "ACCEPTED",
                  });
               }

               if (
                  acceptedSuggestion &&
                  acceptedSuggestion.schedules &&
                  acceptedSuggestion.schedules.length > 0
               ) {
                  // Lấy tutor userId từ populated tutor
                  const tutor = commitment.tutor as any;
                  const tutorUserId =
                     tutor?.userId?._id?.toString() ||
                     tutor?.userId?.toString();

                  if (!tutorUserId) {
                     console.error(
                        "❌ Webhook Error: Cannot find tutor userId for creating sessions",
                        { tutor, commitmentTutor: commitment.tutor }
                     );
                  } else {
                     console.log(
                        `👤 Tutor userId for creating sessions: ${tutorUserId}`
                     );

                     // Kiểm tra xem đã có sessions chưa (tránh tạo trùng)
                     const existingSessions = await Session.find({
                        learningCommitmentId: commitment._id,
                     });

                     if (existingSessions.length > 0) {
                        console.log(
                           `⚠️ Sessions already exist for commitment ${commitment._id}, skipping creation. Existing count: ${existingSessions.length}`
                        );
                     } else {
                        // Tạo các session CONFIRMED từ suggestion schedules
                        const sessionDocs = acceptedSuggestion.schedules.map(
                           (schedule) => {
                              const startTime = new Date(schedule.start);
                              const endTime = new Date(schedule.end);

                              // Tính attendanceWindow: tutorDeadline = endTime + 15 phút, studentDeadline = endTime + 30 phút
                              const tutorDeadline = new Date(
                                 endTime.getTime() +
                                    TUTOR_CHECKIN_GRACE_MINUTES * 60 * 1000
                              );
                              const studentDeadline = new Date(
                                 endTime.getTime() +
                                    STUDENT_CHECKIN_GRACE_MINUTES * 60 * 1000
                              );

                              return {
                                 learningCommitmentId: commitment._id,
                                 teachingRequestId: commitment.teachingRequest,
                                 startTime: startTime,
                                 endTime: endTime,
                                 status: SessionStatus.CONFIRMED,
                                 studentConfirmation: {
                                    status: "ACCEPTED",
                                    confirmedAt: new Date(),
                                 },
                                 attendanceWindow: {
                                    tutorDeadline,
                                    studentDeadline,
                                 },
                                 createdBy: tutorUserId,
                                 isTrial: false,
                                 location: schedule.location || undefined,
                              };
                           }
                        );

                        if (sessionDocs.length > 0) {
                           await Session.insertMany(sessionDocs);
                        }
                     }
                  }
               } else {
                  console.warn(
                     `⚠️ Accepted suggestion found but no schedules or empty schedules. Suggestion ID: ${
                        acceptedSuggestion?._id
                     }, schedules: ${
                        acceptedSuggestion?.schedules?.length || 0
                     }`
                  );
               }
            } catch (error) {
               console.error(
                  "❌ Webhook Error: Failed to create sessions from suggestion schedules:",
                  error
               );
               // Không throw error để không làm gián đoạn quá trình thanh toán
            }
         } else {
            console.log(
               `⏭️ Skipping session creation: wasPending=${wasPending}, currentStatus=${commitment.status}`
            );
         }
      } else if (tempPayment.type === "package") {
         const packageData = await Package.findById(tempPayment.packageId);
         if (!packageData) {
            console.error("Webhook Error: Package not found");
            throw new Error("Package not found");
         }

         const tutorProfile = await Tutor.findOne({
            userId: tempPayment.userId,
         });
         if (!tutorProfile) {
            console.error("Webhook Error: Tutor profile not found");
            throw new Error("Tutor profile not found");
         }

         // Cập nhật maxStudents và maxQuiz của tutor từ features
         tutorProfile.maxStudents =
            (tutorProfile.maxStudents || 0) +
            (packageData.features?.maxStudents || 0);
         tutorProfile.maxQuiz =
            (tutorProfile.maxQuiz || 0) + (packageData.features?.maxQuiz || 0);

         await tutorProfile.save();
         console.log(
            "Package payment processed successfully for user:",
            tempPayment.userId
         );
      } else if (tempPayment.type === "topup") {
         // Top-up: tăng cả totalAmount và studentPaidAmount bằng cùng 1 số tiền
         const commitment = await LearningCommitment.findById(
            tempPayment.referenceId
         );
         if (!commitment) {
            console.error(
               "Webhook Error: LearningCommitment not found (topup)"
            );
            throw new Error("LearningCommitment not found");
         }

         const addSessions = Number(tempPayment.additionalSessions || 0);
         if (!isNaN(addSessions) && addSessions > 0) {
            commitment.totalSessions =
               (commitment.totalSessions || 0) + addSessions;
         }

         // tăng BOTH totalAmount và studentPaidAmount bằng amount của webhook
         const paidAmount = Number(innerData.amount || 0);
         commitment.totalAmount = (commitment.totalAmount || 0) + paidAmount;
         commitment.studentPaidAmount =
            (commitment.studentPaidAmount || 0) + paidAmount;

         // Nếu muốn: đánh dấu active khi đã trả đủ
         if (commitment.studentPaidAmount >= commitment.totalAmount) {
            commitment.status = "active";
         }

         await commitment.save();
      }

      // Clean up temp data
      await PaymentTemp.deleteOne({ orderCode: innerData.orderCode });
   } else {
      // Payment thất bại
      console.log("Payment failed with code:", webhookData.data.code);
   }

   return { success: true };
};
