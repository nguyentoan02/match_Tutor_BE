import { Request, Response, NextFunction } from "express";
import sessionService from "../services/session.service";
import { CREATED, OK } from "../utils/success.response";
import { UnauthorizedError } from "../utils/error.response";
import { IUser } from "../types/types/user";

class SessionController {
   async create(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user) throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         const result = await sessionService.create(req.body, currentUser);
         new CREATED({
            message: "Session created successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async getById(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user) throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         const result = await sessionService.getById(
            req.params.id,
            currentUser._id as string
         );
         new OK({
            message: "Session fetched successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async listByTeachingRequest(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         if (!req.user) throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         const result = await sessionService.listByTeachingRequest(
            req.params.teachingRequestId,
            currentUser._id as string
         );
         new OK({
            message: "Sessions for the request fetched successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // NEW: List all sessions for the authenticated user (student or tutor)
   async listForUser(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user) throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         const result = await sessionService.listForUser(
            (currentUser._id as string).toString()
         );
         new OK({
            message: "Sessions for the user fetched successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async update(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user) throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         const result = await sessionService.update(
            req.params.id,
            req.body,
            currentUser
         );
         new OK({
            message: "Session updated successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async delete(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user) throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         await sessionService.delete(
            req.params.id,
            (currentUser._id as string).toString()
         );
         res.status(204).send();
      } catch (err) {
         next(err);
      }
   }
}

export default new SessionController();
