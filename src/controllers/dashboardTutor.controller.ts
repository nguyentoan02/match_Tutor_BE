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

// Thêm API trả dữ liệu cho bubble chart (sessions completed per day)
export const getBubbleData = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const userId = (req as any).userId || (req.user && (req.user as any)._id);
      if (!userId) throw new Error("User id missing");

      const month = req.query.month
         ? parseInt(req.query.month as string)
         : undefined;
      const year = req.query.year
         ? parseInt(req.query.year as string)
         : undefined;
      const week = req.query.week
         ? parseInt(req.query.week as string)
         : undefined;

      if (month !== undefined || year !== undefined || week !== undefined) {
         if (!month || month < 1 || month > 12) {
            throw new Error("Invalid month (1-12)");
         }
         if (!year || year < 1970) {
            throw new Error("Invalid year");
         }
         if (!week || week < 1 || week > 4) {
            throw new Error("Invalid week (1-4)");
         }
      }

      const data = await dashboardService.getBubbleData(
         userId.toString(),
         month,
         year,
         week
      );
      return new OK({ metadata: data }).send(res);
   } catch (err) {
      next(err);
   }
};

// Line chart API: sessions per-day by status (COMPLETED / NOT_CONDUCTED)
export const getSessionStatusLine = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const userId = (req as any).userId || (req.user && (req.user as any)._id);
      if (!userId) throw new Error("User id missing");

      const month = req.query.month
         ? parseInt(req.query.month as string)
         : undefined;
      const year = req.query.year
         ? parseInt(req.query.year as string)
         : undefined;
      const week = req.query.week
         ? parseInt(req.query.week as string)
         : undefined;

      if (month !== undefined || year !== undefined || week !== undefined) {
         if (!month || month < 1 || month > 12) {
            throw new Error("Invalid month (1-12)");
         }
         if (!year || year < 1970) {
            throw new Error("Invalid year");
         }
         if (!week || week < 1 || week > 4) {
            throw new Error("Invalid week (1-4)");
         }
      }

      const data = await dashboardService.getSessionStatusLineData(
         userId.toString(),
         month,
         year,
         week
      );
      return new OK({ metadata: data }).send(res);
   } catch (err) {
      next(err);
   }
};

// get all: trả bubble và sessions (đã bỏ phần requests/status distribution)
export const getAllDashboard = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const userId = (req as any).userId || (req.user && (req.user as any)._id);
      if (!userId) throw new Error("User id missing");

      const month = req.query.month
         ? parseInt(req.query.month as string)
         : undefined;
      const year = req.query.year
         ? parseInt(req.query.year as string)
         : undefined;
      const week = req.query.week
         ? parseInt(req.query.week as string)
         : undefined;

      if (month !== undefined || year !== undefined || week !== undefined) {
         if (!month || month < 1 || month > 12) {
            throw new Error("Invalid month (1-12)");
         }
         if (!year || year < 1970) {
            throw new Error("Invalid year");
         }
         if (!week || week < 1 || week > 4) {
            throw new Error("Invalid week (1-4)");
         }
      }

      const [bubble, sessions] = await Promise.all([
         dashboardService.getBubbleData(userId.toString(), month, year, week),
         dashboardService.getSessionStatusLineData(
            userId.toString(),
            month,
            year,
            week
         ),
      ]);

      return new OK({
         metadata: { bubble, sessions },
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
