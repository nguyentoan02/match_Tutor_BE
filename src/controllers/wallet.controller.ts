import { Request, Response } from "express";
import {
   getWalletByUserId,
   withdrawFromWallet,
   getPayoutHistory,
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

      new OK({
         message: "Wallet information retrieved successfully",
         metadata: wallet,
      }).send(res);
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

export const getPayoutHistoryController = async (
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

      const { limit = 6, skip = 0 } = req.query;

      const result = await getPayoutHistory(
         userId,
         parseInt(limit as string),
         parseInt(skip as string)
      );

      new OK({
         message: "Payout history retrieved successfully",
         metadata: result,
      }).send(res);
   } catch (error: any) {
      next(error);
   }
};
