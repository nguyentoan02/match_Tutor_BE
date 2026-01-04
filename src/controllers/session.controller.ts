import { Request, Response, NextFunction } from "express";
import sessionService from "../services/session.service";
import { CREATED, OK } from "../utils/success.response";
import { UnauthorizedError } from "../utils/error.response";
import { IUser } from "../types/types/user";
import { Role } from "../types/enums";
import sessionWrongService from "../services/sessionWrong.service";
import adminSessionService from "../services/adminSession.service";
// Import Role type

class SessionController {
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

   async confirmAttendanceFake(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const result = await adminSessionService.confirmAttendanceFake(
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
            req.user.role as Role,
            req.body
         );

         new OK({
            message: "Attendance rejected successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Reject attendance after session
   async rejectAttendanceFake(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const result = await adminSessionService.rejectAttendanceFake(
            req.params.sessionId,
            req.user._id.toString(),
            req.user.role as Role,
            req.body
         );

         new OK({
            message: "Attendance rejected successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/session/me/deleted
   async listDeletedForUser(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id)
            throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         const result = await sessionWrongService.listDeletedRejectedForUser(
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

   // NEW: GET /api/session/me/cancelled
   async listCancelledForUser(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id)
            throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         const result = await sessionWrongService.listCancelledForUser(
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

   async listAbsenceSessionsForUser(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         if (!req.user?._id)
            throw new UnauthorizedError("Authentication required");
         const currentUser = req.user as IUser;
         const result = await sessionWrongService.listAbsenceSessionsForUser(
            (currentUser._id as string).toString()
         );
         new OK({
            message: "Absence sessions fetched successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async createMany(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         // Gọi service createMany mà bạn vừa viết ở bước trước
         const result = await sessionService.createMany(req.body, req.user);

         new CREATED({
            message: "Batch sessions created successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async getBusy(req: Request, res: Response) {
      if (!req.user?._id) {
         throw new UnauthorizedError("Authentication required");
      }
      const currentUser = req.user as IUser;
      let result: any = [];
      console.log(currentUser);
      if (currentUser.role === "TUTOR") {
         result = await sessionService.getBusy(
            (currentUser._id as string).toString()
         );
      } else if (currentUser.role === "STUDENT") {
         result = await sessionService.getBusyForStudent(
            (currentUser._id as string).toString()
         );
      }

      new OK({
         message: "oke",
         metadata: result,
      }).send(res);
   }
   // NEW: Lấy tất cả session của một learning commitment
   async getSessionsByCommitmentId(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         if (!req.user?._id) {
            throw new UnauthorizedError("Authentication required");
         }

         const { commitmentId } = req.params;
         const result = await adminSessionService.getSessionsByCommitmentId(
            commitmentId,
            req.user._id.toString()
         );

         new OK({
            message: "Sessions for commitment retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new SessionController();
