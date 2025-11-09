import { Request, Response } from "express";
import {
   getWalletByUserId,
   withdrawFromWallet,
} from "../services/wallet.service";

import { OK } from "../utils/success.response";
import { NextFunction } from "express";

export const getWallet = async (req: Request, res: Response) => {
   try {
      // Lấy userId từ req.user (được set bởi auth middleware)
      const userId = req.user?.id || req.user?._id;

      if (!userId) {
         return res.status(401).json({
            success: false,
            message: "User not authenticated",
         });
      }

      const wallet = await getWalletByUserId(userId);

      res.status(200).json({
         success: true,
         message: "Wallet information retrieved successfully",
         data: wallet,
      });
   } catch (error: any) {
      res.status(404).json({
         success: false,
         message: error.message || "Failed to retrieve wallet",
      });
   }
};

export const withdraw = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const userId = req.user?.id || req.user?._id;
      if (!userId) {
         return res
            .status(401)
            .json({ success: false, message: "User not authenticated" });
      }

      const { amount, toBin, toAccountNumber, description } = req.body;

      const result = await withdrawFromWallet(
         userId,
         amount,
         toBin,
         toAccountNumber,
         description
      );

      new OK({
         message: "Withdrawal request created successfully",
         metadata: result,
      }).send(res);
   } catch (error: any) {
      next(error);
   }
};
