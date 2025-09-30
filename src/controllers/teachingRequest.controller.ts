import { Request, Response, NextFunction } from "express";
import teachingRequestService from "../services/teachingRequest.service";
import { CREATED, OK } from "../utils/success.response";
import { IUser } from "../types/types/user";
import { UnauthorizedError } from "../utils/error.response";

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

   async makeTrialDecision(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user) {
            throw new UnauthorizedError(
               "Authentication failed: User not found."
            );
         }
         const { decision } = req.body;
         const result = await teachingRequestService.makeTrialDecision(
            req.params.id,
            req.user as IUser,
            decision
         );
         new OK({
            message: "Trial decision submitted successfully.",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

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
         const { decision } = req.body;
         const result = await teachingRequestService.confirmAction(
            req.params.id,
            req.user as IUser,
            "cancellation",
            decision
         );
         new OK({
            message: "Cancellation confirmation processed.",
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
         const { decision } = req.body;
         const result = await teachingRequestService.confirmAction(
            req.params.id,
            req.user as IUser,
            "completion",
            decision
         );
         new OK({
            message: "Completion confirmation processed.",
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
}

export default new TeachingRequestController();
