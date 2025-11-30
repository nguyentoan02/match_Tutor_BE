import { Request, Response, NextFunction } from "express";
import adminSessionService from "../services/adminSession.service";
import { OK } from "../utils/success.response";
import { UnauthorizedError } from "../utils/error.response";
import { SessionStatus } from "../types/enums/session.enum";

class AdminSessionController {
   async listDisputes(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id)
            throw new UnauthorizedError("Authentication required");
         const status =
            (req.query?.status as "OPEN" | "RESOLVED" | undefined) || undefined;
         const page = parseInt(req.query?.page as string) || 1;
         const limit = parseInt(req.query?.limit as string) || 10;

         const result = await adminSessionService.listDisputes(
            status,
            page,
            limit
         );
         new OK({ message: "Session disputes fetched", metadata: result }).send(
            res
         );
      } catch (err) {
         next(err);
      }
   }

   async getDispute(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id)
            throw new UnauthorizedError("Authentication required");
         const result = await adminSessionService.getDisputeBySessionId(
            req.params.sessionId
         );
         new OK({ message: "Session dispute fetched", metadata: result }).send(
            res
         );
      } catch (err) {
         next(err);
      }
   }

   async resolve(req: Request, res: Response, next: NextFunction) {
      try {
         if (!req.user?._id)
            throw new UnauthorizedError("Authentication required");
         const { decision, adminNotes } = req.body as {
            decision: SessionStatus.COMPLETED | SessionStatus.NOT_CONDUCTED;
            adminNotes?: string;
         };
         const result = await adminSessionService.resolveDispute(
            req.params.sessionId,
            req.user._id.toString(),
            decision,
            adminNotes
         );
         new OK({ message: "Session dispute resolved", metadata: result }).send(
            res
         );
      } catch (err) {
         next(err);
      }
   }
}

export default new AdminSessionController();
