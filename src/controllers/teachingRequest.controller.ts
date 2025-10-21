import { Request, Response, NextFunction } from "express";
import teachingRequestService from "../services/teachingRequest.service";
import { CREATED, OK } from "../utils/success.response";
import { IUser } from "../types/types/user";

import {
   GetAdminReviewRequestsQuery,
   ResolveAdminReviewParams,
   ResolveAdminReviewBody,
} from "../schemas/teachingRequest.schema";
import { NotFoundError, UnauthorizedError } from "../utils/error.response";

class TeachingRequestController {
   async create(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError(
               "Authentication failed: User not found."
            );
         }
         const result = await teachingRequestService.create(
            req.user._id.toString(),
            req.body
         );
         new CREATED({
            message: "Teaching request created successfully.",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async getById(req: Request, res: Response, next: NextFunction) {
      try {
         const result = await teachingRequestService.getById(req.params.id);
         new OK({
            message: "Request details fetched successfully.",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async respondToRequest(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError(
               "Authentication failed: User not found."
            );
         }
         const { decision } = req.body;
         const result = await teachingRequestService.respondToRequest(
            req.params.id,
            req.user._id.toString(),
            decision
         );
         new OK({
            message: "Responded to request successfully.",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // async makeTrialDecision(req: Request, res: Response, next: NextFunction) {
   //    try {
   //       if (!req.user) {
   //          throw new UnauthorizedError(
   //             "Authentication failed: User not found."
   //          );
   //       }
   //       const { decision } = req.body;
   //       const result = await teachingRequestService.makeTrialDecision(
   //          req.params.id,
   //          req.user as IUser,
   //          decision
   //       );
   //       new OK({
   //          message: "Trial decision submitted successfully.",
   //          metadata: result,
   //       }).send(res);
   //    } catch (err) {
   //       next(err);
   //    }
   // }

   async requestCancellation(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user) {
            throw new UnauthorizedError(
               "Authentication failed: User not found."
            );
         }
         const { reason } = req.body;
         const result = await teachingRequestService.requestCancellation(
            req.params.id,
            req.user as IUser,
            reason
         );
         new OK({
            message: "Cancellation requested successfully.",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async requestCompletion(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user) {
            throw new UnauthorizedError(
               "Authentication failed: User not found."
            );
         }
         const { reason } = req.body;
         const result = await teachingRequestService.requestCompletion(
            req.params.id,
            req.user as IUser,
            reason
         );
         new OK({
            message: "Completion requested successfully.",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async confirmCancellation(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user) {
            throw new UnauthorizedError(
               "Authentication failed: User not found."
            );
         }
         const { decision, reason } = req.body;
         const result = await teachingRequestService.confirmAction(
            req.params.id,
            req.user as IUser,
            "cancellation",
            decision,
            reason
         );
         new OK({
            message: `Cancellation ${decision.toLowerCase()} successfully.`,
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async confirmCompletion(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user) {
            throw new UnauthorizedError(
               "Authentication failed: User not found."
            );
         }
         const { decision, reason } = req.body;
         const result = await teachingRequestService.confirmAction(
            req.params.id,
            req.user as IUser,
            "completion",
            decision,
            reason
         );
         new OK({
            message: `Completion ${decision.toLowerCase()} successfully.`,
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async getMyRequestsAsStudent(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError(
               "Authentication failed: User not found."
            );
         }
         const result = await teachingRequestService.listForStudent(
            req.user._id.toString()
         );
         new OK({
            message: "Student's teaching requests fetched successfully.",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async getMyRequestsAsTutor(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError(
               "Authentication failed: User not found."
            );
         }
         const result = await teachingRequestService.listForTutor(
            req.user._id.toString()
         );
         new OK({
            message: "Tutor's teaching requests fetched successfully.",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/teachingRequest/admin/review - Get teaching requests requiring admin review (Admin only)
   async getRequestsForAdminReview(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const result = await teachingRequestService.getRequestsForAdminReview(
            req.query as unknown as GetAdminReviewRequestsQuery
         );

         new OK({
            message:
               "Teaching requests requiring admin review retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // POST /api/teachingRequest/admin/review/:id/resolve - Resolve admin review for a teaching request (Admin only)
   async resolveAdminReview(
      req: Request<ResolveAdminReviewParams, {}, ResolveAdminReviewBody>,
      res: Response,
      next: NextFunction
   ) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id: requestId } = req.params;
         const { decision, adminNotes } = req.body;

         const result = await teachingRequestService.resolveAdminReview(
            requestId,
            currentUser._id.toString(),
            decision,
            adminNotes
         );

         new OK({
            message: `Admin review resolved successfully - ${decision.toLowerCase()}`,
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/teachingRequest/admin/review/recently-resolved
   async getRecentlyResolvedAdminReviews(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         if (!req.user?._id) throw new UnauthorizedError("Not authenticated");
         const result =
            await teachingRequestService.getRecentlyResolvedAdminReviews(
               req.query as unknown as GetAdminReviewRequestsQuery
            );
         new OK({
            message:
               "Recently resolved teaching requests retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/teachingRequest/admin/review/resolved
   async getResolvedAdminReviews(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         if (!req.user?._id) throw new UnauthorizedError("Not authenticated");
         const result =
            await teachingRequestService.getResolvedRequestsForAdminReview(
               req.query as unknown as GetAdminReviewRequestsQuery
            );
         new OK({
            message: "Resolved teaching requests retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/teachingRequest/:id/admin/review/history
   async getAdminReviewHistory(
      req: Request<ResolveAdminReviewParams>,
      res: Response,
      next: NextFunction
   ) {
      try {
         const currentUser = req.user;
         if (!currentUser?._id) {
            throw new UnauthorizedError("Not authenticated");
         }
         const request = await teachingRequestService.getById(req.params.id);
         const history = {
            cancellationHistory: request.cancellationDecisionHistory,
            completionHistory: request.complete_pendingHistory,
         };
         new OK({
            message: "Admin review history retrieved successfully",
            metadata: history,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async getCompletedRequestBetween(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const { studentUserId, tutorId } = req.query;

         if (!studentUserId || !tutorId) {
            throw new NotFoundError("Student user ID or tutor ID is missing.");
         }

         if (typeof studentUserId !== "string" || typeof tutorId !== "string") {
            throw new NotFoundError(
               "Invalid query parameters for studentUserId or tutorId."
            );
         }
         const request =
            await teachingRequestService.getCompletedRequestBetween(
               studentUserId,
               tutorId
            );

         if (!request) {
            return new NotFoundError(
               "No completed teaching request found between you and this tutor"
            );
         }

         new OK({
            message: "Completed teaching request found",
            metadata: { request },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new TeachingRequestController();
