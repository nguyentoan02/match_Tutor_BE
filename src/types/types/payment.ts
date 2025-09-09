import { Document, Types } from "mongoose";
import { PaymentStatusEnum } from "../enums/payment.enum";

export interface IPayment extends Document {
   userId: Types.ObjectId;
   teachingRequestId?: Types.ObjectId;
   packageId?: Types.ObjectId;
   amount: number;
   currency?: string;
   status?: PaymentStatusEnum;
   transactionId?: string;
   paymentMethod?: string;
   createdAt?: Date;
   updatedAt?: Date;
}
