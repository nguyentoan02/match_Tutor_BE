import { Request, Response, NextFunction } from "express";
import adminService from "../services/admin.service";
import { OK } from "../utils/success.response";
import {
   NotFoundError,
   UnauthorizedError,
   BadRequestError,
} from "../utils/error.response";
import { 
   BanUserParams, 
   BanUserBody, 
   UnbanUserParams, 
   GetBannedUsersQuery,
   GetUserBanHistoryParams,
   GetBannedTutorsQuery,
   GetActiveTutorsQuery,
   GetBannedStudentsQuery,
   GetActiveStudentsQuery,
   AcceptTutorParams,
   RejectTutorParams,
   RejectTutorBody,
   GetPendingTutorsQuery
} from "../schemas/admin.schema";

class AdminController {
   // POST /api/admin/user/:id/ban - Ban a user (Admin only)
   async banUser(req: Request<BanUserParams, {}, BanUserBody>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id: userId } = req.params;
         const { reason } = req.body;

         // Check if trying to ban self
         if (currentUser._id.toString() === userId) {
            throw new BadRequestError("Cannot ban yourself");
         }

         const bannedUser = await adminService.banUser(
            userId,
            reason,
            currentUser._id.toString()
         );

         new OK({
            message: "User banned successfully",
            metadata: { user: bannedUser },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // POST /api/admin/user/:id/unban - Unban a user (Admin only)
   async unbanUser(req: Request<UnbanUserParams>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id: userId } = req.params;

         const unbannedUser = await adminService.unbanUser(
            userId,
            currentUser._id.toString()
         );

         new OK({
            message: "User unbanned successfully",
            metadata: { user: unbannedUser },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/user/banned - Get banned users list (Admin only)
   async getBannedUsers(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const page = parseInt(req.query.page as string || "1", 10);
         const limit = parseInt(req.query.limit as string || "10", 10);
         const search = req.query.search as string;

         const result = await adminService.getBannedUsers({
            page,
            limit,
            search,
         });

         new OK({
            message: "Banned users retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/user/:id/ban-history - Get user ban history (Admin only)
   async getUserBanHistory(req: Request<GetUserBanHistoryParams>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id: userId } = req.params;

         const user = await adminService.getUserBanHistory(userId);

         new OK({
            message: "User ban history retrieved successfully",
            metadata: { user },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/users - Get all users with pagination and search (Admin only)
   async getAllUsers(req: Request<{}, {}, {}, { page?: string; limit?: string; search?: string; role?: string }>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const page = parseInt(req.query.page || "1", 10);
         const limit = parseInt(req.query.limit || "10", 10);
         const search = req.query.search;
         const role = req.query.role;

         const result = await adminService.getAllUsers({
            page,
            limit,
            search,
            role,
         });

         new OK({
            message: "Users retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/tutors/banned - Get banned tutors (Admin only)
   async getBannedTutors(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const result = await adminService.getBannedTutors(req.query as unknown as GetBannedTutorsQuery);

         new OK({
            message: "Banned tutors retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/tutors/active - Get active tutors (Admin only)
   async getActiveTutors(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const result = await adminService.getActiveTutors(req.query as unknown as GetActiveTutorsQuery);

         new OK({
            message: "Active tutors retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/students/banned - Get banned students (Admin only)
   async getBannedStudents(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const result = await adminService.getBannedStudents(req.query as unknown as GetBannedStudentsQuery);

         new OK({
            message: "Banned students retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/students/active - Get active students (Admin only)
   async getActiveStudents(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const result = await adminService.getActiveStudents(req.query as unknown as GetActiveStudentsQuery);

         new OK({
            message: "Active students retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // POST /api/admin/tutor/:id/accept - Accept tutor profile (Admin only)
   async acceptTutor(req: Request<AcceptTutorParams>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id: tutorId } = req.params;

         const tutor = await adminService.acceptTutor(
            tutorId,
            currentUser._id.toString()
         );

         new OK({
            message: "Tutor profile accepted successfully",
            metadata: { tutor },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // POST /api/admin/tutor/:id/reject - Reject tutor profile (Admin only)
   async rejectTutor(req: Request<RejectTutorParams, {}, RejectTutorBody>, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id: tutorId } = req.params;
         const { reason } = req.body;

         const tutor = await adminService.rejectTutor(
            tutorId,
            reason,
            currentUser._id.toString()
         );

         new OK({
            message: "Tutor profile rejected successfully",
            metadata: { tutor },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/tutors/pending - Get pending tutors (Admin only)
   async getPendingTutors(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const result = await adminService.getPendingTutors(req.query as unknown as GetPendingTutorsQuery);

         new OK({
            message: "Pending tutors retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // GET /api/admin/tutor/:id - Get tutor profile by ID (Admin only)
   async getTutorProfile(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id: tutorId } = req.params;

         const result = await adminService.getTutorProfile(tutorId);

         new OK({
            message: result.message,
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }


   // GET /api/admin/tutors/mapping - Get tutors with userId and tutorId mapping (Admin only)
   async getTutorsWithMapping(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const page = parseInt(req.query.page as string || "1", 10);
         const limit = parseInt(req.query.limit as string || "10", 10);
         const search = req.query.search as string;
         const status = req.query.status as 'all' | 'pending' | 'approved' | 'banned' || 'all';

         const result = await adminService.getTutorsWithMapping({
            page,
            limit,
            search,
            status
         });

         new OK({
            message: "Tutors with mapping retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new AdminController();
