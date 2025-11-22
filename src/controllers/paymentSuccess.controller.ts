import { Request, Response, NextFunction } from "express";
import paymentSuccessService from "../services/paymentSuccess.service";
import { OK } from "../utils/success.response";
import { UnauthorizedError } from "../utils/error.response";
import { IUser } from "../types/types/user";

class PaymentTutorController {
   /**
    * GET /paymentSuccess/payments
    * Lấy danh sách payment thành công của tutor
    */
   async getSuccessfulPaymentsTutor(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const currentUser = req.user as IUser;
         const page = parseInt(req.query.page as string) || 1;
         const limit = parseInt(req.query.limit as string) || 6;

         const userId = String(currentUser._id);
         const result = await paymentSuccessService.getSuccessfulPaymentsTutor(
            userId,
            page,
            limit
         );

         new OK({
            message: "Payment history retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (error) {
         next(error);
      }
   }

   /**
    * GET /paymentSuccess/payments
    * Lấy danh sách payment thành công của student (learningCommitment)
    */
   async getSuccessfulPaymentsStudent(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const currentUser = req.user as IUser;
         const page = parseInt(req.query.page as string) || 1;
         const limit = parseInt(req.query.limit as string) || 6;

         const userId = String(currentUser._id);
         const result =
            await paymentSuccessService.getSuccessfulPaymentsStudent(
               userId,
               page,
               limit
            );

         new OK({
            message: "Payment history retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (error) {
         next(error);
      }
   }
}

export default new PaymentTutorController();
