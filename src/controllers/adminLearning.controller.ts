import { Request, Response, NextFunction } from "express";
import { AdminLearningService } from "../services/adminLearning.service";

const adminLearningService = new AdminLearningService();

class AdminLearningController {
   // GET: List all learning commitments
   listLearningCommitments = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      try {
         const { status, tutorId, studentId, page, limit } = req.query;

         const result = await adminLearningService.listLearningCommitments({
            status: status as string,
            tutorId: tutorId as string,
            studentId: studentId as string,
            page: page ? parseInt(page as string) : 1,
            limit: limit ? parseInt(limit as string) : 10,
         });

         res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
         });
      } catch (error) {
         next(error);
      }
   };

   // GET: Get detail of a learning commitment
   getLearningCommitmentDetail = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      try {
         const { id } = req.params;

         const commitment =
            await adminLearningService.getLearningCommitmentDetail(id);

         res.status(200).json({
            success: true,
            data: commitment,
         });
      } catch (error) {
         next(error);
      }
   };

   // GET: List cases with disagreements
   getDisagreementCases = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      try {
         const { page, limit } = req.query;

         const result = await adminLearningService.getDisagreementCases(
            page ? parseInt(page as string) : 1,
            limit ? parseInt(limit as string) : 10
         );

         res.status(200).json({
            success: true,
            data: result.data,
            pagination: result.pagination,
            message:
               "Danh sách các case cần admin review với thống kê vắng mặt",
         });
      } catch (error) {
         next(error);
      }
   };

   // POST: Handle cancellation disagreement
   handleCancellationDisagreement = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      try {
         const { id } = req.params;
         const { adminNotes } = req.body;
         const adminId = req.user?.id;

         if (!adminId) {
            return res.status(401).json({
               success: false,
               message: "Admin ID not found",
            });
         }

         const result =
            await adminLearningService.handleCancellationDisagreement(
               id,
               adminId,
               adminNotes
            );

         res.status(200).json({
            success: true,
            message: result.message,
            data: result.commitment,
         });
      } catch (error) {
         next(error);
      }
   };

   // POST: Approve cancellation
   approveCancellation = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      try {
         const { id } = req.params;
         const { adminNotes } = req.body;
         const adminId = req.user?.id;

         if (!adminId) {
            return res.status(401).json({
               success: false,
               message: "Admin ID not found",
            });
         }

         const result = await adminLearningService.approveCancellation(
            id,
            adminId,
            adminNotes
         );

         res.status(200).json({
            success: true,
            message: result.message,
            data: result.commitment,
         });
      } catch (error) {
         next(error);
      }
   };

   // POST: Reject cancellation
   rejectCancellation = async (
      req: Request,
      res: Response,
      next: NextFunction
   ) => {
      try {
         const { id } = req.params;
         const { adminNotes } = req.body;
         const adminId = req.user?.id;

         if (!adminId) {
            return res.status(401).json({
               success: false,
               message: "Admin ID not found",
            });
         }

         const result = await adminLearningService.rejectCancellation(
            id,
            adminId,
            adminNotes
         );

         res.status(200).json({
            success: true,
            message: result.message,
            data: result.commitment,
         });
      } catch (error) {
         next(error);
      }
   };
}

export default new AdminLearningController();
