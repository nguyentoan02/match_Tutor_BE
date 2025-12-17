import Wallet from "../models/wallet.model";
import PayoutHistory from "../models/payoutHistory.model";
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
         throw new BadRequestError("Số dư của bạn không đủ để rút");
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

      // Kiểm tra chi tiết transaction
      let transactionState = "PROCESSING";
      let transactionData = null;
      let hasFailedTransaction = false;

      if (payoutResult.transactions && payoutResult.transactions.length > 0) {
         transactionData = payoutResult.transactions[0];
         transactionState = transactionData.state;

         // Check if transaction failed
         if (transactionData.state === "FAILED") {
            hasFailedTransaction = true;
            throw new Error(
               `PayOS error: Transaction failed - ${
                  transactionData.errorMessage || "Unknown error"
               }`
            );
         }
      }

      // Nếu thành công, trừ tiền trong ví và lưu lại
      wallet.balance -= amount;
      await wallet.save();

      // Lưu lịch sử rút tiền
      const payoutHistory = new PayoutHistory({
         userId: new Types.ObjectId(userId),
         referenceId,
         amount,
         toBin,
         toAccountNumber,
         toAccountName: transactionData?.toAccountName || null,
         description: description || `Withdraw ${amount} from wallet`,
         state: transactionState,
         approvalState: payoutResult.approvalState,
         payoutId: payoutResult.id,
         transactionId: transactionData?.id || null,
      });

      await payoutHistory.save();

      return {
         payoutResult: payoutResult,
         newBalance: wallet.balance,
         payoutHistory,
      };
   } catch (error) {
      throw error;
   }
};

export const getPayoutHistory = async (userId: string, limit = 6, skip = 0) => {
   try {
      if (!Types.ObjectId.isValid(userId)) {
         throw new Error("Invalid user ID format");
      }

      const payoutHistories = await PayoutHistory.find({
         userId: new Types.ObjectId(userId),
      })
         .sort({ createdAt: -1 })
         .limit(limit)
         .skip(skip);

      const total = await PayoutHistory.countDocuments({
         userId: new Types.ObjectId(userId),
      });

      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.floor(skip / limit) + 1;

      return {
         data: payoutHistories,
         pagination: {
            total,
            limit,
            skip,
            currentPage,
            totalPages,
         },
      };
   } catch (error) {
      throw error;
   }
};
