import { Document, model, Schema, Types } from "mongoose";

export type PaymentType = "package" | "learningCommitment" | "topup";

export interface IPayment extends Document {
   userId: Types.ObjectId;
   type: PaymentType;
   referenceId?: Types.ObjectId;
   packageId?: Types.ObjectId;
   orderCode: number;
   amount: number;
   status: "PENDING" | "SUCCESS" | "FAILED";
   transactionId?: string;
   createdAt: Date;
   updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      type: {
         type: String,
         enum: ["package", "learningCommitment", "topup"],
         required: true,
      },
      referenceId: { type: Schema.Types.ObjectId, ref: "LearningCommitment" },
      packageId: { type: Schema.Types.ObjectId, ref: "Package" },
      orderCode: { type: Schema.Types.Mixed, required: true, unique: true },
      amount: { type: Number, required: true },
      status: {
         type: String,
         enum: ["PENDING", "SUCCESS", "FAILED"],
         default: "PENDING",
      },
      transactionId: { type: String },
   },
   { timestamps: true }
);

const Payment = model<IPayment>("Payment", paymentSchema);

export default Payment;
