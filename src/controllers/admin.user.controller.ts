import { Request, Response, NextFunction } from "express";
import adminUserService from "../services/admin.user.service";
import { OK } from "../utils/success.response";
import { UnauthorizedError } from "../utils/error.response";
import { 
   GetBannedTutorsQuery,
   GetActiveTutorsQuery,
   GetBannedStudentsQuery,
   GetActiveStudentsQuery
} from "../schemas/admin.schema";

class AdminUserController {
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

         const result = await adminUserService.getAllUsers({
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

         const result = await adminUserService.getBannedTutors(req.query as unknown as GetBannedTutorsQuery);

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

         const result = await adminUserService.getActiveTutors(req.query as unknown as GetActiveTutorsQuery);

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

         const result = await adminUserService.getBannedStudents(req.query as unknown as GetBannedStudentsQuery);

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

         const result = await adminUserService.getActiveStudents(req.query as unknown as GetActiveStudentsQuery);

         new OK({
            message: "Active students retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new AdminUserController();

