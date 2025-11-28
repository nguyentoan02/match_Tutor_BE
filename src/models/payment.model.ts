import { Document, model, Schema, Types } from "mongoose";

export interface IPayment extends Document {
   userId: Types.ObjectId; // Người thanh toán (student)
   type: "package" | "learningCommitment"; // Loại thanh toán
   referenceId: Types.ObjectId; // ID của learningCommitment (chỉ dùng khi type là "learningCommitment")
   packageId?: Types.ObjectId; // ID của package (chỉ dùng khi type là "package")
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
         enum: ["package", "learningCommitment"],
         required: true,
      },
      referenceId: {
         type: Schema.Types.ObjectId,
         required: function () {
            return this.type === "learningCommitment";
         },
      },
      packageId: {
         type: Schema.Types.ObjectId,
         ref: "Package",
         required: function () {
            return this.type === "package";
         },
      },
      orderCode: { type: Number, required: true, unique: true },
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

// Tạo index phức hợp bao phủ toàn bộ điều kiện query
paymentSchema.index({ userId: 1, type: 1, status: 1 });
const Payment = model<IPayment>("Payment", paymentSchema);

export default Payment;
