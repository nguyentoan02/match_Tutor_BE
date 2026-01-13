import { NextFunction, Request, Response } from "express";

import { GetAdminTransactionHistoryQuery } from "../../schemas/admin.schema";
import adminTransactionService from "../../services/admin/admin.transaction.service";
import { OK } from "../../utils/success.response";

class AdminTransactionController {
   async getTransactionHistory(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const filters = req.query as unknown as GetAdminTransactionHistoryQuery;
         const transactions =
            await adminTransactionService.getTransactionHistory(filters);

         new OK({
            message: "Transaction history retrieved successfully",
            metadata: transactions,
         }).send(res);
      } catch (error) {
         next(error);
      }
   }

   async getPackageTransactions(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const filters = req.query as unknown as GetAdminTransactionHistoryQuery;
         const result =
            await adminTransactionService.getPackageTransactions(filters);

         new OK({
            message: "Package transactions retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (error) {
         next(error);
      }
   }

   async getCommitmentTransactions(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const filters = req.query as unknown as GetAdminTransactionHistoryQuery;
         const result =
            await adminTransactionService.getCommitmentTransactions(filters);

         new OK({
            message: "Learning commitment transactions retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (error) {
         next(error);
      }
   }

   async getAdminWalletBalance(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const walletBalance =
            await adminTransactionService.getAdminWalletBalance();

         new OK({
            message: "Admin wallet balance retrieved successfully",
            metadata: walletBalance,
         }).send(res);
      } catch (error) {
         next(error);
      }
   }
}

export default new AdminTransactionController();

