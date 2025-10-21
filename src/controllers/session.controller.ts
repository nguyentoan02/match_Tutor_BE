import { Request, Response, NextFunction } from "express";
import sessionService from "../services/session.service";
import { CREATED, OK } from "../utils/success.response";
import { UnauthorizedError } from "../utils/error.response";
import { IUser } from "../types/types/user";
import { Role } from "../types/enums";
// Import Role type

class SessionController {
   async create(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const result = await sessionService.create(req.body, req.user);

         new CREATED({
            message: "Session created successfully by tutor",
            metadata: {
               ...result.toObject(),
               createdByInfo: {
                  userId: req.user._id,
                  role: req.user.role,
                  name: req.user.name,
               },
            },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async getById(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const result = await sessionService.getById(
            req.params.id,
            req.user._id.toString()
         );

         new OK({
            message: "Session retrieved successfully",
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

   // Student confirms participation
   async confirmParticipation(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const { decision } = req.body; // "ACCEPTED" | "REJECTED"
         const result = await sessionService.confirmParticipation(
            req.params.sessionId,
            req.user._id.toString(),
            decision
         );

         new OK({
            message: `Session participation ${decision.toLowerCase()}`,
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Cancel a session
   async cancel(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }
         const { reason } = req.body;
         const result = await sessionService.cancel(
            req.params.sessionId,
            req.user._id.toString(),
            reason
         );
         new OK({
            message: "Session cancelled successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Confirm attendance after session
   async confirmAttendance(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const result = await sessionService.confirmAttendance(
            req.params.sessionId,
            req.user._id.toString(),
            req.user.role as Role
         );

         new OK({
            message: "Attendance confirmed successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Reject attendance after session
   async rejectAttendance(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const result = await sessionService.rejectAttendance(
            req.params.sessionId,
            req.user._id.toString(),
            req.user.role as Role
         );

         new OK({
            message: "Attendance rejected successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/sessions/deleted/:id
   async getDeletedRejectedById(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         if (!req.user?._id)
            throw new UnauthorizedError("Authentication required");

         const result = await sessionService.getDeletedRejectedSessionById(
            req.params.id,
            req.user._id.toString()
         );

         new OK({
            message: "Deleted rejected session retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/sessions/me/deleted
   async listDeletedForUser(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id)
            throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         const result = await sessionService.listDeletedRejectedForUser(
            (currentUser._id as string).toString()
         );
         new OK({
            message: "Deleted rejected sessions for user fetched successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // NEW: GET /api/sessions/me/cancelled
   async listCancelledForUser(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id)
            throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         const result = await sessionService.listCancelledForUser(
            (currentUser._id as string).toString()
         );
         new OK({
            message: "Cancelled sessions for user fetched successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new SessionController();
