import { Request, Response, NextFunction } from "express";
import teachingRequestService from "../services/teachingRequest.service";
import { CREATED, OK } from "../utils/success.response";
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
