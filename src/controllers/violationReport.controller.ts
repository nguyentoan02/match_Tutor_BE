import { Request, Response, NextFunction } from "express";
import violationReportService from "../services/violationReport.service";
import { OK } from "../utils/success.response";
import { UnauthorizedError } from "../utils/error.response";

class ViolationReportController {
   /**
    * Kiểm tra student có thể report tutor không
    * GET /api/violation-reports/check/:tutorId
    */
   async checkCanReport(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { tutorId } = req.params;
         const canReport = await violationReportService.canStudentReportTutor(
            currentUser._id.toString(),
            tutorId
         );

         new OK({
            message: "Check report eligibility completed",
            metadata: { canReport },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   /**
    * Tạo violation report
    * POST /api/violation-reports
    */
   async createReport(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { tutorId, type, reason, evidenceFiles, relatedTeachingRequestId } = req.body;

         const report = await violationReportService.createReport(
            currentUser._id.toString(),
            tutorId,
            {
               type,
               reason,
               evidenceFiles,
               relatedTeachingRequestId,
            }
         );

         new OK({
            message: "Violation report created successfully",
            metadata: { report },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   /**
    * Lấy danh sách violation reports (admin only)
    * GET /api/violation-reports
    */
   async getReports(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const page = parseInt(req.query.page as string || "1", 10);
         const limit = parseInt(req.query.limit as string || "10", 10);
         const status = req.query.status as string;
         const type = req.query.type as string;

         const result = await violationReportService.getReports({
            page,
            limit,
            status: status as any,
            type: type as any,
         });

         new OK({
            message: "Violation reports retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   /**
    * Cập nhật status của violation report (admin only)
    * PATCH /api/violation-reports/:id/status
    */
   async updateReportStatus(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const { id } = req.params;
         const { status } = req.body;

         const report = await violationReportService.updateReportStatus(
            id,
            status,
            currentUser._id.toString()
         );

         new OK({
            message: "Violation report status updated successfully",
            metadata: { report },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new ViolationReportController();


