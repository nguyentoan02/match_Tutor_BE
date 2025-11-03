// filepath: d:\Test_SEP490_3\match_Tutor_BE\src\models\paymentTemp.model.ts
import { Document, model, Schema, Types } from "mongoose";

export interface IPaymentTemp extends Document {
   userId: Types.ObjectId;
   type: "package" | "learningCommitment";
   referenceId?: Types.ObjectId; // ID của learningCommitment
   packageId?: Types.ObjectId; // ID của package
   orderCode: number;
   createdAt: Date;
   updatedAt: Date;
}

const paymentTempSchema = new Schema<IPaymentTemp>(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      type: {
         type: String,
         enum: ["package", "learningCommitment"],
         required: true,
      },
      referenceId: { type: Schema.Types.ObjectId },
      packageId: { type: Schema.Types.ObjectId, ref: "Package" },
      orderCode: { type: Number, required: true, unique: true },
   },
   { timestamps: true }
);

const PaymentTemp = model<IPaymentTemp>("PaymentTemp", paymentTempSchema);

export default PaymentTemp;
