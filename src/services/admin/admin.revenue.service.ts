import Payment from "../../models/payment.model";
import AdminWallet from "../../models/adminWallet.model";

const SUCCESSFUL_PAYMENT_STATUSES = ["SUCCESS", "PAID"];

class AdminRevenueService {
   async getAdminRevenue() {
      const [packageRevenueAgg, adminWalletAgg] = await Promise.all([
         Payment.aggregate([
            {
               $match: {
                  type: "package",
                  status: { $in: SUCCESSFUL_PAYMENT_STATUSES },
               },
            },
            {
               $group: {
                  _id: null,
                  totalRevenue: { $sum: "$amount" },
                  transactionCount: { $sum: 1 },
               },
            },
         ]),
         AdminWallet.aggregate([
            {
               $group: {
                  _id: null,
                  totalBalance: { $sum: "$balance" },
               },
            },
         ]),
      ]);

      const packageRevenue = packageRevenueAgg[0]?.totalRevenue || 0;
      const packageTransactionCount = packageRevenueAgg[0]?.transactionCount || 0;
      const adminWalletBalance = adminWalletAgg[0]?.totalBalance || 0;
      const totalRevenue = packageRevenue + adminWalletBalance;

      return {
         packageRevenue,
         packageTransactionCount,
         adminWalletBalance,
         totalRevenue,
      };
   }
}

export default new AdminRevenueService();
