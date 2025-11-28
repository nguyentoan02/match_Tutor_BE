import { Request, Response, NextFunction } from "express";
import studentDashboardService from "../services/studentDashboard.service";
import { OK } from "../utils/success.response";
import { UnauthorizedError } from "../utils/error.response";

class StudentDashboardController {
    async getDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.user?._id) {
                throw new UnauthorizedError("Authentication required");
            }

            const studentUserId = String(req.user._id);
            const dashboardData = await studentDashboardService.getStudentDashboard(studentUserId);

            new OK({
                message: "Student dashboard fetched successfully",
                metadata: dashboardData,
            }).send(res);
        } catch (error) {
            next(error);
        }
    }
}

export default new StudentDashboardController();