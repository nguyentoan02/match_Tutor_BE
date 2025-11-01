import { Request, Response } from "express";
import { getWalletByUserId } from "../services/wallet.service";

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
