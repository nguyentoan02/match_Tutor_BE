import { FilterQuery, Types } from "mongoose";

import AdminWallet from "../../models/adminWallet.model";
import LearningCommitment from "../../models/learningCommitment.model";
import Payment, { IPayment } from "../../models/payment.model";
import User from "../../models/user.model";
import { GetAdminTransactionHistoryQuery } from "../../schemas/admin.schema";

type PopulatedUser = {
   _id: Types.ObjectId;
   name?: string;
   email?: string;
   phone?: string;
   role?: string;
};

type PopulatedPackage = {
   _id: Types.ObjectId;
   name?: string;
   price?: number;
};

type LeanPayment = {
   _id: Types.ObjectId;
   orderCode: number;
   amount: number;
   status: IPayment["status"];
   type: IPayment["type"];
   transactionId?: string;
   createdAt: Date;
   updatedAt: Date;
   referenceId?: Types.ObjectId;
   userId: PopulatedUser;
   packageId?: PopulatedPackage | null;
};

type LeanCommitment = {
   _id: Types.ObjectId;
   status: string;
   totalAmount: number;
   studentPaidAmount: number;
   completedSessions: number;
   totalSessions: number;
   cancellationDecisionHistory?: Array<{
      requestedBy?: "student" | "tutor";
   }>;
   isMoneyTransferred: boolean;
   tutor?: {
      _id: Types.ObjectId;
      userId?: PopulatedUser;
   } | null;
   student?: {
      _id: Types.ObjectId;
      userId?: PopulatedUser;
   } | null;
};

class AdminTransactionService {
   async getTransactionHistory(
      filters: GetAdminTransactionHistoryQuery
   ): Promise<{
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      transactions: Array<Record<string, unknown>>;
   }> {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const skip = (page - 1) * limit;

      const query: FilterQuery<IPayment> = await this.buildFilterQuery(filters);

      const [transactions, total] = await Promise.all([
         Payment.find(query)
            .populate({ path: "userId", select: "name email phone role" })
            .populate({ path: "packageId", select: "name price" })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean<LeanPayment[]>(),
         Payment.countDocuments(query),
      ]);

      const commitmentMap = await this.fetchLearningCommitments(transactions);

      const formattedTransactions = transactions.map((payment) => {
         const adminAmount = this.calculateAdminAmount(payment, commitmentMap);
         return {
            id: payment._id,
            orderCode: payment.orderCode,
            amount: payment.amount, // Tổng tiền giao dịch
            adminAmount: adminAmount, // Số tiền admin thực sự nhận được
            status: payment.status,
            type: payment.type,
            transactionId: payment.transactionId,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            user: this.formatUser(payment.userId),
            source: this.buildSource(payment, commitmentMap),
         };
      });

      return {
         page,
         limit,
         total,
         totalPages: limit ? Math.ceil(total / limit) : 0,
         transactions: formattedTransactions,
      };
   }

   private async buildFilterQuery(
      filters: GetAdminTransactionHistoryQuery
   ): Promise<FilterQuery<IPayment>> {
      const query: FilterQuery<IPayment> = {};

      if (filters.type) {
         query.type = filters.type;
      }

      if (filters.status) {
         if (filters.status === "PAID") {
            query.status = "SUCCESS";
         } else {
            query.status = filters.status as IPayment["status"];
         }
      }

      if (filters.userId && Types.ObjectId.isValid(filters.userId)) {
         query.userId = new Types.ObjectId(filters.userId);
      }

      if (filters.startDate || filters.endDate) {
         query.createdAt = {};
         if (filters.startDate) {
            query.createdAt.$gte = filters.startDate;
         }
         if (filters.endDate) {
            query.createdAt.$lte = filters.endDate;
         }
      }

      if (filters.search?.trim()) {
         const searchConditions = await this.buildSearchConditions(
            filters.search.trim()
         );
         if (searchConditions.length) {
            query.$and = [...(query.$and || []), { $or: searchConditions }];
         }
      }

      return query;
   }

   private async buildSearchConditions(
      search: string
   ): Promise<FilterQuery<IPayment>[]> {
      const regex = new RegExp(search, "i");
      const conditions: FilterQuery<IPayment>[] = [
         { transactionId: { $regex: regex } },
      ];

      const orderCode = Number(search);
      if (!Number.isNaN(orderCode)) {
         conditions.push({ orderCode });
      }

      const users = await User.find(
         {
            $or: [{ name: regex }, { email: regex }, { phone: regex }],
         },
         { _id: 1 }
      ).lean();

      if (users.length) {
         conditions.push({
            userId: { $in: users.map((user) => user._id) },
         });
      }

      return conditions;
   }

   private async fetchLearningCommitments(
      payments: LeanPayment[]
   ): Promise<Map<string, LeanCommitment>> {
      const learningCommitmentIds = payments
         .filter(
            (payment) =>
               payment.type === "learningCommitment" && payment.referenceId
         )
         .map((payment) => payment.referenceId!.toString());

      const uniqueCommitmentIds = Array.from(new Set(learningCommitmentIds));

      if (!uniqueCommitmentIds.length) {
         return new Map<string, LeanCommitment>();
      }

      const commitments = await LearningCommitment.find({
         _id: { $in: uniqueCommitmentIds },
      })
         .select(
            "status totalAmount studentPaidAmount completedSessions totalSessions cancellationDecisionHistory isMoneyTransferred"
         )
         .populate({
            path: "student",
            select: "userId",
            populate: {
               path: "userId",
               select: "name email phone role",
            },
         })
         .populate({
            path: "tutor",
            select: "userId",
            populate: {
               path: "userId",
               select: "name email phone role",
            },
         })
         .lean();

      return new Map<string, LeanCommitment>(
         commitments.map((commitment: any) => [
            commitment._id.toString(),
            commitment as LeanCommitment,
         ])
      );
   }

   private formatUser(user?: {
      _id?: Types.ObjectId;
      name?: string;
      email?: string;
      phone?: string;
      role?: string;
   }) {
      if (!user?._id) {
         return null;
      }

      return {
         id: user._id.toString(),
         name: user.name,
         email: user.email,
         phone: user.phone,
         role: user.role,
      };
   }

   private buildSource(
      payment: LeanPayment,
      commitmentMap: Map<string, LeanCommitment>
   ) {
      if (payment.type === "package") {
         return payment.packageId
            ? {
                 kind: "package",
                 packageId: payment.packageId._id,
                 name: payment.packageId.name,
                 price: payment.packageId.price,
              }
            : null;
      }

      if (payment.type === "learningCommitment" && payment.referenceId) {
         const commitment = commitmentMap.get(payment.referenceId.toString());

         if (!commitment) {
            return {
               kind: "learningCommitment",
               commitmentId: payment.referenceId,
            };
         }

         return {
            kind: "learningCommitment",
            commitmentId: commitment._id,
            status: commitment.status,
            totalAmount: commitment.totalAmount,
            tutor: this.formatUser(commitment.tutor?.userId),
            student: this.formatUser(commitment.student?.userId),
         };
      }

      return null;
   }

   /**
    * Tính số tiền admin thực sự nhận được từ mỗi giao dịch
    * - Package: 100% số tiền
    * - Learning Commitment: Tính theo logic chia tiền dựa trên trạng thái
    */
   private calculateAdminAmount(
      payment: LeanPayment,
      commitmentMap: Map<string, LeanCommitment>
   ): number {
      // Package: Admin nhận 100%
      if (payment.type === "package") {
         return payment.amount;
      }

      // Learning Commitment: Tính theo trạng thái
      if (payment.type === "learningCommitment" && payment.referenceId) {
         const commitment = commitmentMap.get(payment.referenceId.toString());

         if (!commitment) {
            // Chưa có commitment hoặc chưa xử lý, admin chưa nhận tiền
            return 0;
         }

         // Nếu tiền chưa được chuyển, admin chưa nhận
         if (!commitment.isMoneyTransferred) {
            return 0;
         }

         const { status, studentPaidAmount, totalSessions, completedSessions, cancellationDecisionHistory } =
            commitment;

         // Completed: Admin nhận 10% của studentPaidAmount
         if (status === "completed") {
            return studentPaidAmount * 0.1;
         }

         // Cancelled: Tính theo logic phức tạp hơn
         if (status === "cancelled") {
            if (totalSessions === 0) {
               return 0;
            }

            const lastCancellation =
               cancellationDecisionHistory?.[cancellationDecisionHistory.length - 1];
            const cancelledByTutor = lastCancellation?.requestedBy === "tutor";
            const pricePerSession = studentPaidAmount / totalSessions;
            const amountForTaughtSessions = completedSessions * pricePerSession;
            const amountForUntrainedSessions =
               studentPaidAmount - amountForTaughtSessions;

            if (cancelledByTutor) {
               // Gia sư huỷ: Admin nhận 10% tiền buổi đã học
               return amountForTaughtSessions * 0.1;
            } else {
               // Học sinh huỷ: Admin nhận 10% tiền buổi đã học + toàn bộ tiền buổi chưa học
               return amountForTaughtSessions * 0.1 + amountForUntrainedSessions;
            }
         }

         // Các trạng thái khác: Admin chưa nhận tiền
         return 0;
      }

      return 0;
   }

   /**
    * Lấy danh sách giao dịch package với phân trang
    */
   async getPackageTransactions(
      filters: GetAdminTransactionHistoryQuery
   ): Promise<{
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      transactions: Array<Record<string, unknown>>;
      totalAmount: number;
   }> {
      const page = filters.page ?? 1;
      const limit = filters.limit ?? 20;
      const skip = (page - 1) * limit;

      // Tái sử dụng buildFilterQuery và chỉ thêm type: package
      const baseQuery = await this.buildFilterQuery(filters);
      const query: FilterQuery<IPayment> = {
         ...baseQuery,
         type: "package",
      };

      const [transactions, total, totalAmountResult] = await Promise.all([
         Payment.find(query)
            .populate({ path: "userId", select: "name email phone role" })
            .populate({ path: "packageId", select: "name price" })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean<LeanPayment[]>(),
         Payment.countDocuments(query),
         Payment.aggregate([
            { $match: query },
            {
               $group: {
                  _id: null,
                  totalAmount: { $sum: "$amount" },
               },
            },
         ]),
      ]);

      const formattedTransactions = transactions.map((payment) => ({
         id: payment._id,
         orderCode: payment.orderCode,
         amount: payment.amount,
         adminAmount: payment.amount, // Package: admin nhận 100%
         status: payment.status,
         transactionId: payment.transactionId,
         createdAt: payment.createdAt,
         updatedAt: payment.updatedAt,
         user: this.formatUser(payment.userId),
         package: payment.packageId
            ? {
                 id: payment.packageId._id,
                 name: payment.packageId.name,
                 price: payment.packageId.price,
              }
            : null,
      }));

      const totalAmount = totalAmountResult[0]?.totalAmount || 0;

      return {
         page,
         limit,
         total,
         totalPages: limit ? Math.ceil(total / limit) : 0,
         transactions: formattedTransactions,
         totalAmount,
      };
   }

   /**
    * Lấy số dư hiện tại của admin wallet
    */
   async getAdminWalletBalance(): Promise<{
      balance: number;
      walletInfo: {
         _id: Types.ObjectId;
         balance: number;
         createdAt: Date;
         updatedAt: Date;
      };
   }> {
      let adminWallet = await AdminWallet.findOne({});

      if (!adminWallet) {
         adminWallet = await AdminWallet.create({ balance: 0 });
      }

      const walletObj = adminWallet.toObject() as any;

      return {
         balance: adminWallet.balance,
         walletInfo: {
            _id: adminWallet._id as Types.ObjectId,
            balance: adminWallet.balance,
            createdAt: walletObj.createdAt || new Date(),
            updatedAt: walletObj.updatedAt || new Date(),
         },
      };
   }
}

export default new AdminTransactionService();

