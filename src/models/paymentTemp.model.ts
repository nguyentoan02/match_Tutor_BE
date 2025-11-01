// filepath: d:\Test_SEP490_3\match_Tutor_BE\src\models\paymentTemp.model.ts
import mongoose, { Schema, Document } from "mongoose";

interface IPaymentTemp extends Document {
   orderCode: number;
   userId: string;
   referenceId: string;
}

const PaymentTempSchema = new Schema<IPaymentTemp>({
   orderCode: { type: Number, required: true, unique: true },
   userId: { type: String, required: true },
   referenceId: { type: String, required: true },
});

export default mongoose.model<IPaymentTemp>("PaymentTemp", PaymentTempSchema);
