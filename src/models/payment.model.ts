import mongoose, { Schema } from "mongoose";
import { IPayment } from "../types/types/payment";
import { getVietnamTime } from "../utils/date.util";
import {
   PAYMENT_STATUS_VALUES,
   PaymentStatusEnum,
} from "../types/enums/payment.enum";

const PaymentSchema: Schema<IPayment> = new Schema(
   {
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      teachingRequestId: {
         type: Schema.Types.ObjectId,
         ref: "TeachingRequest",
      },
      packageId: { type: Schema.Types.ObjectId, ref: "Package" },
      amount: { type: Number, required: true },
      currency: { type: String, default: "VND" },
      status: {
         type: String,
         enum: PAYMENT_STATUS_VALUES,
         default: PaymentStatusEnum.PENDING,
      },
      transactionId: { type: String },
      paymentMethod: { type: String },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "payments",
   }
);

PaymentSchema.index({ userId: 1, teachingRequestId: 1, status: 1 });

export default mongoose.model<IPayment>("Payment", PaymentSchema);
