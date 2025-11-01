import { Request, Response, NextFunction } from "express";
import * as paymentService from "../services/payment.service";
import { OK } from "../utils/success.response";

class PaymentController {
   // POST /api/payment/webhook
   async webHook(req: Request, res: Response, next: NextFunction) {
      try {
         // PayOS gửi payload trong body
         const payload = req.body;
         await paymentService.webHook({ data: payload });
         new OK({
            message: "Webhook processed",
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new PaymentController();
