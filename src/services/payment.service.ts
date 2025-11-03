import payos from "../config/payos";
import Payment from "../models/payment.model";
import LearningCommitment from "../models/learningCommitment.model";
import PaymentTemp from "../models/paymentTemp.model";
import Package from "../models/package.model";
import Tutor from "../models/tutor.model";

export const createLearningCommitmentPayment = async (
   learningCommitmentId: string,
   userId: string,
   amount: number
) => {
   const orderCode = Date.now();
   const paymentData = {
      orderCode,
      amount,
      description: `Payment`,
      returnUrl: `${process.env.FRONTEND_URL}/student/learning-commitments?status=success&id=${learningCommitmentId}`,
      cancelUrl: `${process.env.FRONTEND_URL}/student/learning-commitments?status=cancelled&id=${learningCommitmentId}`,
   };

   const paymentLink = await payos.paymentRequests.create(paymentData);
   console.log("PayOS Response:", paymentLink);

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
   console.log("PayOS Response:", paymentLink);

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

export const webHook = async (webhookData: { data: any }) => {
   console.log("Full webhookData:", JSON.stringify(webhookData, null, 2));
   const { data: innerData } = webhookData.data;

   // BƯỚC 1: Bỏ qua webhook test từ PayOS
   if (innerData.orderCode === 123 || innerData.orderCode === "123") {
      console.log("PayOS test webhook received, ignoring...");
      return { success: true, message: "Test webhook ignored" };
   }

   // BƯỚC 2: Chỉ xử lý khi thanh toán thành công (code === "00")
   if (webhookData.data.code === "00") {
      // Retrieve temp data
      const tempPayment = await PaymentTemp.findOne({
         orderCode: innerData.orderCode,
      });
      if (!tempPayment) {
         console.error("Webhook Error: Temp payment data not found");
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
         );
         if (!commitment) {
            console.error("Webhook Error: LearningCommitment not found");
            throw new Error("LearningCommitment not found");
         }
         commitment.studentPaidAmount += innerData.amount;
         if (commitment.studentPaidAmount >= commitment.totalAmount) {
            commitment.status = "active";
         }
         await commitment.save();
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
      }

      // Clean up temp data
      await PaymentTemp.deleteOne({ orderCode: innerData.orderCode });
   } else {
      // Payment thất bại
      console.log("Payment failed with code:", webhookData.data.code);
   }

   return { success: true };
};
