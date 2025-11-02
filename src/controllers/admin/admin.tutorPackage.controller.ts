import { Request, Response, NextFunction } from "express";
import adminService from "../../services/admin/index";
import { OK } from "../../utils/success.response";
import { UnauthorizedError } from "../../utils/error.response";

class AdminTutorPackageController {
   // Tạo gói tutor mới
   async createTutorPackage(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const packageData = req.body;
         const tutorPackage = await adminService.createTutorPackage(packageData);

         new OK({
            message: "Tutor package created successfully",
            metadata: { tutorPackage },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Lấy tất cả gói tutor
   async getAllTutorPackages(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const page = parseInt(req.query.page as string) || 1;
         const limit = parseInt(req.query.limit as string) || 10;
         const isActive = req.query.isActive ? req.query.isActive === "true" : undefined;

         const result = await adminService.getAllTutorPackages(page, limit, isActive);

         new OK({
            message: "Tutor packages retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Lấy gói theo ID
   async getTutorPackageById(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id } = req.params;
         const tutorPackage = await adminService.getTutorPackageById(id);

         new OK({
            message: "Tutor package retrieved successfully",
            metadata: { tutorPackage },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Cập nhật gói
   async updateTutorPackage(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id } = req.params;
         const updateData = req.body;
         const tutorPackage = await adminService.updateTutorPackage(id, updateData);

         new OK({
            message: "Tutor package updated successfully",
            metadata: { tutorPackage },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Lấy thống kê
   async getTutorPackageStats(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const stats = await adminService.getTutorPackageStats();

         new OK({
            message: "Tutor package statistics retrieved successfully",
            metadata: { stats },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Lấy tutor đang sử dụng gói
   async getTutorsUsingPackage(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id } = req.params;
         const page = parseInt(req.query.page as string) || 1;
         const limit = parseInt(req.query.limit as string) || 10;

         const result = await adminService.getTutorsUsingPackage(id, page, limit);

         new OK({
            message: "Tutors using package retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Cập nhật status của gói (isActive, popular)
   async updateTutorPackageStatus(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id } = req.params;
         const { isActive, popular } = req.body;
         
         const updateData: any = { isActive };
         if (popular !== undefined) {
            updateData.popular = popular;
         }

         const tutorPackage = await adminService.updateTutorPackage(id, updateData);

         new OK({
            message: "Tutor package status updated successfully",
            metadata: { tutorPackage },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new AdminTutorPackageController();
