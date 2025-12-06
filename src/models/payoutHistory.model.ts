import mongoose, { Schema } from "mongoose";
import { getVietnamTime } from "../utils/date.util";

export interface IPayoutHistory {
   _id?: mongoose.Types.ObjectId;
   userId: mongoose.Types.ObjectId;
   referenceId: string;
   amount: number;
   toBin: string;
   toAccountNumber: string;
   toAccountName?: string;
   description?: string;
   state: string;
   approvalState: string;
   payoutId: string;
   transactionId?: string;
   createdAt?: Date;
   updatedAt?: Date;
}

const PayoutHistorySchema: Schema<IPayoutHistory> = new Schema(
   {
      userId: {
         type: mongoose.Schema.Types.ObjectId,
         ref: "User",
         required: true,
      },
      referenceId: { type: String, required: true, unique: true },
      amount: { type: Number, required: true },
      toBin: { type: String, required: true },
      toAccountNumber: { type: String, required: true },
      toAccountName: { type: String },
      description: { type: String },
      state: { type: String, default: "PROCESSING" },
      approvalState: { type: String, default: "PROCESSING" },
      payoutId: { type: String, required: true },
      transactionId: { type: String },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
   }
);

export default mongoose.model<IPayoutHistory>(
   "PayoutHistory",
   PayoutHistorySchema
);
