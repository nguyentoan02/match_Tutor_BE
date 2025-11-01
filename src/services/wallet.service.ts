import Wallet from "../models/wallet.model";
import { Types } from "mongoose";

export const getWalletByUserId = async (userId: string) => {
   try {
      // Validate userId
      if (!Types.ObjectId.isValid(userId)) {
         throw new Error("Invalid user ID format");
      }

      const wallet = await Wallet.findOne({
         userId: new Types.ObjectId(userId),
      });

      if (!wallet) {
         throw new Error("Wallet not found for this user");
      }

      return wallet;
   } catch (error) {
      throw error;
   }
};
