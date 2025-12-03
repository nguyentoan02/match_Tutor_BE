import Tutor from "../models/tutor.model";
import LearningCommitment from "../models/learningCommitment.model";
import TeachingRequest from "../models/teachingRequest.model";
import Session from "../models/session.model";
import Payment from "../models/payment.model";
import { Types } from "mongoose";

class DashboardService {
   // Trả về đúng các trường: activeStudents, maxStudents, maxQuiz, teachingRequestsReceived
   public async getTutorOverview(userId: string) {
      const tutor = await Tutor.findOne({ userId })
         .select("maxStudents maxQuiz")
         .lean();
      if (!tutor) {
         throw new Error("Tutor profile not found");
      }

      const tutorId = (tutor as any)._id;

      // số học sinh đang active theo LearningCommitment
      const activeStudents = await LearningCommitment.countDocuments({
         tutor: tutorId,
         status: "active",
      });

      // số teaching request đã nhận bởi tutor (bất kể status)
      const teachingRequestsReceived = await TeachingRequest.countDocuments({
         tutorId: tutorId,
      });

      const maxStudents = tutor.maxStudents || 0;
      const maxQuiz = tutor.maxQuiz || 0;

      return {
         activeStudents,
         maxStudents,
         maxQuiz,
         teachingRequestsReceived,
      };
   }

   public async getBubbleData(
      userId: string,
      month?: number,
      year?: number,
      week?: number
   ) {
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      if (!tutor) throw new Error("Tutor profile not found");

      const tutorId = (tutor as any)._id as Types.ObjectId;

      let weekStart: Date;
      let weekEnd: Date;

      if (month !== undefined && year !== undefined && week !== undefined) {
         const firstDayOfMonth = new Date(year, month - 1, 1);
         weekStart = new Date(firstDayOfMonth);
         weekStart.setDate(firstDayOfMonth.getDate() + (week - 1) * 7);

         weekEnd = new Date(weekStart);
         weekEnd.setDate(weekStart.getDate() + 7);

         const lastDayOfMonth = new Date(year, month, 0);
         const exclusiveMonthEnd = new Date(
            lastDayOfMonth.getFullYear(),
            lastDayOfMonth.getMonth(),
            lastDayOfMonth.getDate() + 1
         );
         if (weekEnd > exclusiveMonthEnd) {
            weekEnd.setTime(exclusiveMonthEnd.getTime());
         }
      } else {
         const now = new Date();
         const startOfToday = new Date(now);
         startOfToday.setHours(0, 0, 0, 0);

         const mondayOffset = (startOfToday.getDay() + 6) % 7;
         weekStart = new Date(startOfToday);
         weekStart.setDate(startOfToday.getDate() - mondayOffset);

         weekEnd = new Date(weekStart);
         weekEnd.setDate(weekStart.getDate() + 7);
      }

      // Lấy tất cả learningCommitment của tutor để lọc session
      const commitments = await LearningCommitment.find({ tutor: tutorId })
         .select("_id")
         .lean();
      const commitmentIds = commitments.map((c: any) => c._id);

      if (commitmentIds.length === 0) {
         const days = [];
         for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            days.push({
               date: d,
               count: 0,
            });
         }
         return { days, range: { start: weekStart, end: weekEnd } };
      }

      // Aggregate sessions completed grouped by day (startTime)
      const agg = await Session.aggregate([
         {
            $match: {
               learningCommitmentId: { $in: commitmentIds },
               status: "COMPLETED",
               startTime: { $gte: weekStart, $lt: weekEnd },
            },
         },
         {
            $group: {
               _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
               },
               count: { $sum: 1 },
            },
         },
      ]);

      const countMap: Record<string, number> = {};
      agg.forEach((a: any) => {
         countMap[a._id] = a.count;
      });

      const days = [];
      for (let i = 0; i < 7; i++) {
         const d = new Date(weekStart);
         d.setDate(weekStart.getDate() + i);
         const key = d.toISOString().slice(0, 10);
         days.push({
            date: d,
            count: countMap[key] || 0,
         });
      }

      return { days, range: { start: weekStart, end: weekEnd } };
   }

   // Line chart data for sessions per-day by status (COMPLETED / NOT_CONDUCTED)
   public async getSessionStatusLineData(
      userId: string,
      month?: number,
      year?: number,
      week?: number
   ) {
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      if (!tutor) throw new Error("Tutor profile not found");

      const tutorId = (tutor as any)._id as Types.ObjectId;

      let weekStart: Date;
      let weekEnd: Date;

      if (month !== undefined && year !== undefined && week !== undefined) {
         const firstDayOfMonth = new Date(year, month - 1, 1);
         weekStart = new Date(firstDayOfMonth);
         weekStart.setDate(firstDayOfMonth.getDate() + (week - 1) * 7);

         weekEnd = new Date(weekStart);
         weekEnd.setDate(weekStart.getDate() + 7);

         const lastDayOfMonth = new Date(year, month, 0);
         const exclusiveMonthEnd = new Date(
            lastDayOfMonth.getFullYear(),
            lastDayOfMonth.getMonth(),
            lastDayOfMonth.getDate() + 1
         );
         if (weekEnd > exclusiveMonthEnd) {
            weekEnd.setTime(exclusiveMonthEnd.getTime());
         }
      } else {
         const now = new Date();
         const startOfToday = new Date(now);
         startOfToday.setHours(0, 0, 0, 0);

         const mondayOffset = (startOfToday.getDay() + 6) % 7;
         weekStart = new Date(startOfToday);
         weekStart.setDate(startOfToday.getDate() - mondayOffset);

         weekEnd = new Date(weekStart);
         weekEnd.setDate(weekStart.getDate() + 7);
      }

      // statuses we want to chart
      const statuses = ["COMPLETED", "NOT_CONDUCTED"];

      // get commitments for tutor
      const commitments = await LearningCommitment.find({ tutor: tutorId })
         .select("_id")
         .lean();
      const commitmentIds = commitments.map((c: any) => c._id);

      // if none -> return 7 days with zeros
      if (commitmentIds.length === 0) {
         const days: any[] = [];
         for (let i = 0; i < 7; i++) {
            const d = new Date(weekStart);
            d.setDate(weekStart.getDate() + i);
            days.push({
               date: d,
               counts: statuses.reduce(
                  (acc, s) => ((acc[s] = 0), acc),
                  {} as Record<string, number>
               ),
               total: 0,
            });
         }
         return { statuses, days, range: { start: weekStart, end: weekEnd } };
      }

      // aggregate sessions by date and status
      const agg = await Session.aggregate([
         {
            $match: {
               learningCommitmentId: { $in: commitmentIds },
               status: { $in: statuses },
               startTime: { $gte: weekStart, $lt: weekEnd },
            },
         },
         {
            $project: {
               date: {
                  $dateToString: { format: "%Y-%m-%d", date: "$startTime" },
               },
               status: "$status",
            },
         },
         {
            $group: {
               _id: { date: "$date", status: "$status" },
               count: { $sum: 1 },
            },
         },
      ]);

      const map: Record<string, Record<string, number>> = {};
      agg.forEach((a: any) => {
         const date = a._id.date;
         const status = a._id.status;
         map[date] = map[date] || {};
         map[date][status] = a.count;
      });

      const days: any[] = [];
      for (let i = 0; i < 7; i++) {
         const d = new Date(weekStart);
         d.setDate(weekStart.getDate() + i);
         const key = d.toISOString().slice(0, 10);
         const countsForDay: Record<string, number> = {};
         let total = 0;
         statuses.forEach((s) => {
            const c = (map[key] && map[key][s]) || 0;
            countsForDay[s] = c;
            total += c;
         });

         days.push({
            date: d,
            counts: countsForDay,
            total,
         });
      }

      return { statuses, days, range: { start: weekStart, end: weekEnd } };
   }

   // NEW: tổng session theo tất cả status của tutor đó
   public async getSessionStatusDistribution(userId: string) {
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      if (!tutor) throw new Error("Tutor profile not found");

      // Lấy tất cả session do user (tutor) tạo — không lọc theo commitment hay thời gian
      const agg = await Session.aggregate([
         { $match: { createdBy: new Types.ObjectId(userId) } },
         {
            $group: {
               _id: "$status",
               count: { $sum: 1 },
            },
         },
      ]);

      if (!agg || agg.length === 0) {
         return { distribution: [] };
      }

      const distribution = agg.map((a: any) => ({
         status: a._id,
         value: a.count,
      }));
      return { distribution };
   }

   // NEW: tổng tiền tutor đã chi cho package (userId chính là user._id của tutor)
   public async getMoneySpentOnPackages(
      userId: string,
      month?: number,
      year?: number,
      week?: number
   ) {
      // Không lọc theo ngày — lấy tổng cho tất cả thời gian
      const match: any = {
         userId: new Types.ObjectId(userId),
         type: "package",
         status: "SUCCESS",
      };

      const agg = await Payment.aggregate([
         { $match: match },
         {
            $group: {
               _id: null,
               total: { $sum: "$amount" },
            },
         },
      ]);
      const total = agg.length ? agg[0].total : 0;
      return { total };
   }

   // NEW: distribution learning commitment theo status
   public async getLearningCommitmentDistribution(userId: string) {
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      if (!tutor) throw new Error("Tutor profile not found");
      const tutorId = (tutor as any)._id as Types.ObjectId;

      const agg = await LearningCommitment.aggregate([
         { $match: { tutor: tutorId } },
         {
            $group: {
               _id: "$status",
               count: { $sum: 1 },
            },
         },
      ]);
      const distribution = agg.map((a: any) => ({
         status: a._id,
         value: a.count,
      }));
      return { distribution };
   }
}

export default new DashboardService();
