import payos from "../config/payos";
import Payment from "../models/payment.model";
import LearningCommitment from "../models/learningCommitment.model";
import PaymentTemp from "../models/paymentTemp.model";

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

   // Chỉ tạo link, không lưu Payment record
   const paymentLink = await payos.paymentRequests.create(paymentData);
   console.log("PayOS Response:", paymentLink);

   // Save temp data for webhook
   const tempPayment = new PaymentTemp({
      orderCode,
      userId,
      referenceId: learningCommitmentId,
   });
   await tempPayment.save();

   // Trả về checkoutUrl để frontend redirect
   return {
      paymentLink: paymentLink.checkoutUrl,
      orderCode, // Gửi orderCode về frontend để track
   };
};

export const webHook = async (webhookData: { data: any }) => {
   console.log("Full webhookData:", JSON.stringify(webhookData, null, 2));
   const { data: innerData } = webhookData.data; // Access nested data

   // BƯỚC 1: Bỏ qua webhook test từ PayOS
   if (innerData.orderCode === 123 || innerData.orderCode === "123") {
      console.log("PayOS test webhook received, ignoring...");
      return { success: true, message: "Test webhook ignored" };
   }

   // BƯỚC 2: Chỉ xử lý khi thanh toán thành công (code === "00")
   if (webhookData.data.code === "00") {
      // Use outer code
      // Retrieve temp data
      const tempPayment = await PaymentTemp.findOne({
         orderCode: innerData.orderCode,
      });
      if (!tempPayment) {
         console.error("Webhook Error: Temp payment data not found");
         throw new Error("Temp payment data not found");
      }

      // BƯỚC 3: Tạo Payment record lúc này (thành công)
      const newPayment = new Payment({
         userId: tempPayment.userId,
         type: "learningCommitment",
         referenceId: tempPayment.referenceId,
         orderCode: innerData.orderCode,
         amount: innerData.amount,
         status: "SUCCESS",
         transactionId: innerData.reference,
      });
      await newPayment.save();

      // Clean up temp data
      await PaymentTemp.deleteOne({ orderCode: innerData.orderCode });

      // BƯỚC 4: Cập nhật LearningCommitment
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
   } else {
      // Payment thất bại - không lưu vào DB
      console.log("Payment failed with code:", webhookData.data.code);
   }

   return { success: true };
};
