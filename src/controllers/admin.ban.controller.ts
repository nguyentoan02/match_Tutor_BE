import { Request, Response, NextFunction } from "express";
import adminBanService from "../services/admin.ban.service";
import { OK } from "../utils/success.response";
import { UnauthorizedError, BadRequestError } from "../utils/error.response";
import { 
   BanUserParams, 
   BanUserBody, 
   UnbanUserParams, 
   GetUserBanHistoryParams
} from "../schemas/admin.schema";

class AdminBanController {
   // POST /api/admin/user/:id/ban - Ban a user (Admin only)
   async banUser(req: Request<BanUserParams, {}, BanUserBody>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id: userId } = req.params;
         const { reason } = req.body;

         // Check if trying to ban self
         if (currentUser._id.toString() === userId) {
            throw new BadRequestError("Cannot ban yourself");
         }

         const bannedUser = await adminBanService.banUser(
            userId,
            reason,
            currentUser._id.toString()
         );

         new OK({
            message: "User banned successfully",
            metadata: { user: bannedUser },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // POST /api/admin/user/:id/unban - Unban a user (Admin only)
   async unbanUser(req: Request<UnbanUserParams>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id: userId } = req.params;

         const unbannedUser = await adminBanService.unbanUser(
            userId,
            currentUser._id.toString()
         );

         new OK({
            message: "User unbanned successfully",
            metadata: { user: unbannedUser },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/user/banned - Get banned users list (Admin only)
   async getBannedUsers(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const page = parseInt(req.query.page as string || "1", 10);
         const limit = parseInt(req.query.limit as string || "10", 10);
         const search = req.query.search as string;

         const result = await adminBanService.getBannedUsers({
            page,
            limit,
            search,
         });

         new OK({
            message: "Banned users retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/user/:id/ban-history - Get user ban history (Admin only)
   async getUserBanHistory(req: Request<GetUserBanHistoryParams>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id: userId } = req.params;

         const user = await adminBanService.getUserBanHistory(userId);

         new OK({
            message: "User ban history retrieved successfully",
            metadata: { user },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new AdminBanController();

