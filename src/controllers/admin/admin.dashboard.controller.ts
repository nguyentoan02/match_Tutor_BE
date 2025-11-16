import { Request, Response, NextFunction } from "express";
import adminDashboardService from "../../services/admin/admin.dashboard.service";
import { OK } from "../../utils/success.response";
import { UnauthorizedError } from "../../utils/error.response";

class AdminDashboardController {
   async getSummary(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const rangeParam =
            typeof req.query.range === "string" ? req.query.range : undefined;
         const summary = await adminDashboardService.getDashboardSummary({
            trendRange: rangeParam,
         });

         new OK({
            message: "Admin dashboard summary fetched successfully",
            metadata: summary,
         }).send(res);
      } catch (error) {
         next(error);
      }
   }
}

export default new AdminDashboardController();


