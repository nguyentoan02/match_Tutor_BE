import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../../utils/error.response";
import { OK } from "../../utils/success.response";
import adminReviewService from "../../services/admin/admin.review.service";
import {
   GetReviewVisibilityRequestsQuery,
   HandleReviewVisibilityParams,
   HandleReviewVisibilityBody,
} from "../../schemas/admin.schema";

class AdminReviewController {
   async getVisibilityRequests(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");

         const result = await adminReviewService.getVisibilityRequests(
            req.query as unknown as GetReviewVisibilityRequestsQuery
         );

         new OK({
            message: "Danh sách yêu cầu ẩn đánh giá",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async handleVisibilityRequest(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");

         const { reviewId } = req.params as unknown as HandleReviewVisibilityParams;
         const body = req.body as HandleReviewVisibilityBody;

         const review = await adminReviewService.handleVisibilityRequest(
            reviewId,
            currentUser._id.toString(),
            body
         );

         new OK({
            message:
               body.action === "approve"
                  ? "Đã phê duyệt ẩn đánh giá"
                  : body.action === "reject"
                  ? "Đã từ chối yêu cầu ẩn đánh giá"
                  : "Đã bật lại đánh giá",
            metadata: { review },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new AdminReviewController();

