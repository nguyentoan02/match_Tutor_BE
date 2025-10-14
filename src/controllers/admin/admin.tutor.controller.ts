import { Request, Response, NextFunction } from "express";
import adminTutorService from "../../services/admin/admin.tutor.service";
import { OK } from "../../utils/success.response";
import { UnauthorizedError } from "../../utils/error.response";
import { AcceptTutorParams, RejectTutorParams, RejectTutorBody, GetPendingTutorsQuery } from "../../schemas/admin.schema";

class AdminTutorController {
   async acceptTutor(req: Request<AcceptTutorParams>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const { id: tutorId } = req.params;
         const result = await adminTutorService.acceptTutor(tutorId, currentUser._id.toString());
         new OK({ message: "Tutor profile accepted successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }

   async rejectTutor(req: Request<RejectTutorParams, {}, RejectTutorBody>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const { id: tutorId } = req.params;
         const { reason } = req.body;
         const result = await adminTutorService.rejectTutor(tutorId, reason, currentUser._id.toString());
         new OK({ message: "Tutor profile rejected successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }

   async getPendingTutors(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const result = await adminTutorService.getPendingTutors(req.query as unknown as GetPendingTutorsQuery);
         new OK({ message: "Pending tutors retrieved successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }

   async getTutorProfile(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const { id: tutorId } = req.params;
         const result = await adminTutorService.getTutorProfile(tutorId);
         new OK({ message: result.message, metadata: result }).send(res);
      } catch (err) { next(err); }
   }

   async getTutorsWithMapping(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) throw new UnauthorizedError("Not authenticated");
         const page = parseInt(req.query.page as string || "1", 10);
         const limit = parseInt(req.query.limit as string || "10", 10);
         const search = req.query.search as string;
         const status = req.query.status as 'all' | 'pending' | 'approved' | 'banned' || 'all';
         const result = await adminTutorService.getTutorsWithMapping({ page, limit, search, status });
         new OK({ message: "Tutors with mapping retrieved successfully", metadata: result }).send(res);
      } catch (err) { next(err); }
   }
}

export default new AdminTutorController();
