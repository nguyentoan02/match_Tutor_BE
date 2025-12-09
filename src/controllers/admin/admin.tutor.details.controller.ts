import { Request, Response, NextFunction } from "express";
import adminTutorDetailsService from "../../services/admin/admin.tutor.details.service";
import { OK } from "../../utils/success.response";
import { UnauthorizedError } from "../../utils/error.response";
import {
   GetTutorFullDetailsParams,
   GetTutorLearningCommitmentsParams,
   GetTutorLearningCommitmentsQuery,
   GetTutorSessionsParams,
   GetTutorSessionsQuery,
   GetTutorTeachingRequestsParams,
   GetTutorTeachingRequestsQuery,
   GetTutorViolationReportsParams,
   GetTutorViolationReportsQuery,
   GetTutorReviewsParams,
   GetTutorReviewsQuery,
   GetTutorStatisticsParams,
} from "../../schemas/admin.schema";

class AdminTutorDetailsController {
   // Get full tutor details with summary statistics
   async getTutorFullDetails(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const { id: tutorId } = req.params;
         const result = await adminTutorDetailsService.getTutorFullDetails(tutorId);
         new OK({ message: "Tutor full details retrieved successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }

   // Get tutor learning commitments
   async getTutorLearningCommitments(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const { id: tutorId } = req.params;
         const result = await adminTutorDetailsService.getTutorLearningCommitments(
            tutorId,
            req.query as unknown as GetTutorLearningCommitmentsQuery
         );
         new OK({ message: "Tutor learning commitments retrieved successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }

   // Get tutor sessions
   async getTutorSessions(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const { id: tutorId } = req.params;
         const result = await adminTutorDetailsService.getTutorSessions(
            tutorId,
            req.query as unknown as GetTutorSessionsQuery
         );
         new OK({ message: "Tutor sessions retrieved successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }

   // Get tutor teaching requests
   async getTutorTeachingRequests(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const { id: tutorId } = req.params;
         const result = await adminTutorDetailsService.getTutorTeachingRequests(
            tutorId,
            req.query as unknown as GetTutorTeachingRequestsQuery
         );
         new OK({ message: "Tutor teaching requests retrieved successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }

   // Get tutor violation reports
   async getTutorViolationReports(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const { id: tutorId } = req.params;
         const result = await adminTutorDetailsService.getTutorViolationReports(
            tutorId,
            req.query as unknown as GetTutorViolationReportsQuery
         );
         new OK({ message: "Tutor violation reports retrieved successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }

   // Get tutor reviews
   async getTutorReviews(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const { id: tutorId } = req.params;
         const result = await adminTutorDetailsService.getTutorReviews(
            tutorId,
            req.query as unknown as GetTutorReviewsQuery
         );
         new OK({ message: "Tutor reviews retrieved successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }

   // Get tutor statistics
   async getTutorStatistics(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const { id: tutorId } = req.params;
         const result = await adminTutorDetailsService.getTutorStatistics(tutorId);
         new OK({ message: "Tutor statistics retrieved successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }
}

export default new AdminTutorDetailsController();
