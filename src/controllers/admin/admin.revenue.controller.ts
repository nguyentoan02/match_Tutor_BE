import { Request, Response, NextFunction } from "express";
import adminRevenueService from "../../services/admin/admin.revenue.service";
import { OK } from "../../utils/success.response";
import { UnauthorizedError } from "../../utils/error.response";

class AdminRevenueController {
   async getAdminRevenue(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const revenue = await adminRevenueService.getAdminRevenue();

         new OK({
            message: "Admin revenue retrieved successfully",
            metadata: revenue,
         }).send(res);
      } catch (error) {
         next(error);
      }
   }
}

export default new AdminRevenueController();
