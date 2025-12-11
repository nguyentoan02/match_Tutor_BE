import { Request, Response, NextFunction } from "express";
import dashboardService from "../services/dashboardTutor.service";
import { OK } from "../utils/success.response";

export const getDashboard = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const userId = (req as any).userId || (req.user && (req.user as any)._id);
      if (!userId) throw new Error("User id missing");

      const data = await dashboardService.getTutorOverview(userId.toString());
      return new OK({ metadata: data }).send(res);
   } catch (err) {
      next(err);
   }
};

//  biểu đồ phân tích (Radar & Bar)
export const getAnalysisCharts = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const userId = (req as any).userId || (req.user && (req.user as any)._id);
      if (!userId) throw new Error("User id missing");

      const [subjectData, levelData] = await Promise.all([
         dashboardService.getSubjectAnalysis(userId.toString()),
         dashboardService.getLevelDistribution(userId.toString()),
      ]);

      return new OK({
         metadata: {
            subjectAnalysis: subjectData.subjectAnalysis,
            levelDistribution: levelData.levelDistribution,
         },
      }).send(res);
   } catch (err) {
      next(err);
   }
};

// NEW handler
export const getPieData = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const userId = (req as any).userId || (req.user && (req.user as any)._id);
      if (!userId) throw new Error("User id missing");

      // Không parse month/year/week ở đây — lấy toàn bộ dữ liệu của tutor
      const [sessions, money, commitments] = await Promise.all([
         dashboardService.getSessionStatusDistribution(userId.toString()),
         dashboardService.getMoneySpentOnPackages(userId.toString()),
         dashboardService.getLearningCommitmentDistribution(userId.toString()),
      ]);

      return new OK({
         metadata: {
            sessions: sessions.distribution,
            moneySpent: money.total,
            learningCommitments: commitments.distribution,
         },
      }).send(res);
   } catch (err) {
      next(err);
   }
};

// Cập nhật handler để mặc định tháng/năm hiện tại
export const getSessionStats = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const userId = (req as any).userId || (req.user && (req.user as any)._id);
      if (!userId) throw new Error("User id missing");

      const { month, year } = req.query;
      const monthNum = month ? parseInt(month as string, 10) : undefined;
      const yearNum = year ? parseInt(year as string, 10) : undefined;

      // Validate nếu có nhập (optional)
      if (monthNum && (monthNum < 1 || monthNum > 12)) {
         throw new Error("Invalid month. Must be 1-12.");
      }
      if (yearNum && yearNum < 1900) {
         throw new Error("Invalid year.");
      }

      const data = await dashboardService.getSessionStatsByMonthYear(
         userId.toString(),
         monthNum,
         yearNum
      );
      return new OK({ metadata: data }).send(res);
   } catch (err) {
      next(err);
   }
};
