import Wallet from "../models/wallet.model";
import { Types } from "mongoose";
import payos from "../config/payosPayout";
import { v4 as uuidv4 } from "uuid";
import { BadRequestError, NotFoundError } from "../utils/error.response";

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

export const withdrawFromWallet = async (
   userId: string,
   amount: number,
   toBin: string,
   toAccountNumber: string,
   description?: string
) => {
   try {
      const wallet = await getWalletByUserId(userId);

      if (wallet.balance < amount) {
         throw new BadRequestError("Insufficient balance");
      }

      const referenceId = `withdraw_${userId}_${uuidv4()}`;

      const payoutData = {
         referenceId,
         amount,
         toBin,
         toAccountNumber,
         description: description || `Withdraw ${amount} from wallet`,
      };

      // Gọi API của PayOS để tạo lệnh chi
      const payoutResult = await payos.payouts.create(payoutData);

      // Check if payout creation was successful
      // Accept APPROVED, PROCESSING, and COMPLETED states as valid
      if (
         payoutResult.approvalState !== "APPROVED" &&
         payoutResult.approvalState !== "PROCESSING" &&
         payoutResult.approvalState !== "COMPLETED"
      ) {
         throw new Error(
            `PayOS error: Payout creation failed with approval state: ${payoutResult.approvalState}`
         );
      }

      // Check if there are any transaction errors
      if (payoutResult.transactions && payoutResult.transactions.length > 0) {
         const failedTransaction = payoutResult.transactions.find(
            (t) => t.state === "FAILED"
         );
         if (failedTransaction) {
            throw new Error(
               `PayOS error: Transaction failed - ${failedTransaction.errorMessage}`
            );
         }
      }

      // Nếu thành công, trừ tiền trong ví và lưu lại
      wallet.balance -= amount;
      await wallet.save();

      return { payoutResult: payoutResult, newBalance: wallet.balance };
   } catch (error) {
      throw error;
   }
};
