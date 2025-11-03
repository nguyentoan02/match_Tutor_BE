import { Request, Response, NextFunction } from "express";
import * as packagePaymentService from "../services/packagePayment.service";
import { OK } from "../utils/success.response";

export const initiatePackagePayment = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const { packageId } = req.body;
      const userId = req.user?._id as string;

      if (!packageId) {
         throw new Error("Package ID is required");
      }

      if (!userId) {
         throw new Error("User ID is required");
      }

      const paymentLink = await packagePaymentService.createPackagePaymentLink(
         userId,
         packageId
      );

      return new OK({
         message: "Payment link created successfully",
         metadata: { paymentLink },
      }).send(res);
   } catch (error) {
      next(error);
   }
};
