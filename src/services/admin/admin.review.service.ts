import reviewService from "../review.service";
import {
   GetReviewVisibilityRequestsQuery,
   HandleReviewVisibilityBody,
} from "../../schemas/admin.schema";
import { ReviewVisibilityRequestStatusEnum } from "../../types/enums/review.enum";

class AdminReviewService {
   getVisibilityRequests(query: GetReviewVisibilityRequestsQuery) {
      const { status, page, limit, tutorUserId } = query;
      return reviewService.getVisibilityRequests({
         status: status as ReviewVisibilityRequestStatusEnum | undefined,
         page,
         limit,
         tutorUserId,
      });
   }

   handleVisibilityRequest(
      reviewId: string,
      adminUserId: string,
      body: HandleReviewVisibilityBody
   ) {
      const { action, note } = body;
      return reviewService.handleVisibilityRequest(reviewId, adminUserId, action, note);
   }
}

export default new AdminReviewService();

