import Payment, { IPayment } from "../models/payment.model";
import Package from "../models/package.model";
import Tutor from "../models/tutor.model";
import { BadRequestError } from "../utils/error.response";
import * as paymentService from "./payment.service";

export const createPackagePaymentLink = async (
   userId: string,
   packageId: string
) => {
   // Kiểm tra gói package tồn tại
   const packageData = await Package.findById(packageId);
   if (!packageData) throw new BadRequestError("Package not found");

   // Kiểm tra tutor profile tồn tại
   const tutorProfile = await Tutor.findOne({ userId }).select("_id");
   if (!tutorProfile) throw new BadRequestError("Tutor profile not found");

   // Tạo payment record
   const payment = await paymentService.createPackagePayment(
      userId,
      packageId,
      packageData.price
   );

   return payment.paymentLink;
};
