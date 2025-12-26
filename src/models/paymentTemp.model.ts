// filepath: d:\Test_SEP490_3\match_Tutor_BE\src\models\paymentTemp.model.ts
import { Document, model, Schema, Types } from "mongoose";

export interface IPaymentTemp extends Document {
   userId: Types.ObjectId;
   type: "package" | "learningCommitment" | "topup";
   referenceId?: Types.ObjectId; // ID của learningCommitment
   packageId?: Types.ObjectId; // ID của package
   orderCode: number;
   additionalSessions?: number; // <-- thêm để tương thích với payment.service.ts
   createdAt: Date;
   updatedAt: Date;
}

const paymentTempSchema = new Schema<IPaymentTemp>(
   {
      orderCode: { type: Schema.Types.Mixed, required: true, unique: true },
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      referenceId: { type: Schema.Types.ObjectId, ref: "LearningCommitment" },
      packageId: { type: Schema.Types.ObjectId, ref: "Package" },
      type: {
         type: String,
         enum: ["learningCommitment", "package", "topup"],
         required: true,
      },
      additionalSessions: { type: Number }, // <-- added for topup
   },
   { timestamps: true }
);

const PaymentTemp = model<IPaymentTemp>("PaymentTemp", paymentTempSchema);

export default PaymentTemp;
