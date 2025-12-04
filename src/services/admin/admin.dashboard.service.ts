import adminStatisticsService from "./admin.statistics.service";
import adminUserService from "./admin.user.service";
import User from "../../models/user.model";
import Tutor from "../../models/tutor.model";
import LearningCommitment from "../../models/learningCommitment.model";
import Payment from "../../models/payment.model";
import Session from "../../models/session.model";
import ViolationReport from "../../models/violationReport.model";
import AdminWallet from "../../models/adminWallet.model";
import { PipelineStage } from "mongoose";

const PRESET_TREND_RANGES = [7, 30, 90];

const SUCCESSFUL_PAYMENT_STATUSES = ["SUCCESS", "PAID"];

const formatDateKey = (date: Date) => {
   const normalized = new Date(date);
   normalized.setHours(0, 0, 0, 0);
   return normalized.toISOString().slice(0, 10);
};

const buildDateKeyRange = (start: Date, days: number) => {
   const keys: string[] = [];
   for (let i = 0; i < days; i += 1) {
      const current = new Date(start);
      current.setDate(start.getDate() + i);
      keys.push(formatDateKey(current));
   }
   return keys;
};

const buildStatusSummary = (
   raw: Array<{ _id: string; count: number }>,
   expectedKeys: string[]
) => {
   const summary: Record<string, number> = {};
   expectedKeys.forEach((key) => {
      summary[key] = 0;
   });

   raw.forEach((item) => {
      if (item?._id) {
         summary[item._id] = item.count;
      }
   });

   return summary;
};

class AdminDashboardService {
   async getDashboardSummary(options?: { trendRange?: string }) {
      const now = new Date();
      const startOfToday = new Date(now);
      startOfToday.setHours(0, 0, 0, 0);
      const sevenDaysAgo = new Date(startOfToday);
      sevenDaysAgo.setDate(startOfToday.getDate() - 6);

      const allowedTrendRanges = new Set(["7", "30", "90", "all"]);
      const trendRangeParam = options?.trendRange;
      const trendRangeSelection = allowedTrendRanges.has(trendRangeParam || "")
         ? (trendRangeParam as "7" | "30" | "90" | "all")
         : "7";
      const trendRangeDays =
         trendRangeSelection === "all" ? null : Number(trendRangeSelection);

      const trendRangeEnd = new Date(startOfToday);
      const trendRangeStart = trendRangeDays ? new Date(startOfToday) : null;
      if (trendRangeStart && trendRangeDays) {
         trendRangeStart.setDate(
            startOfToday.getDate() - (trendRangeDays - 1)
         );
      }

      let aggregationStart: Date | null = null;
      if (trendRangeSelection !== "all") {
         const requiredDays = Math.max(
            trendRangeDays || 0,
            ...PRESET_TREND_RANGES
         );
         aggregationStart = new Date(startOfToday);
         aggregationStart.setDate(
            startOfToday.getDate() - (requiredDays - 1)
         );
      }

      const revenueTrendMatch: Record<string, any> = {
         status: { $in: SUCCESSFUL_PAYMENT_STATUSES },
         type: "package",
      };
      if (aggregationStart) {
         revenueTrendMatch.createdAt = {
            $gte: aggregationStart,
            $lte: trendRangeEnd,
         };
      }

      const revenueTrendPipeline: PipelineStage[] = [
         { $match: revenueTrendMatch },
         {
            $group: {
               _id: {
                  $dateTrunc: { date: "$createdAt", unit: "day" },
               },
               totalAmount: { $sum: "$amount" },
            },
         },
         { $sort: { _id: 1 } },
      ];

      const [
         userStats,
         newUsersLast7Days,
         latestUsers,
         tutorCounts,
         learningCommitmentStatusAgg,
         paymentsByStatus,
         revenueTrendRaw,
         recentPaymentsRaw,
         openDisputesCount,
         resolvedDisputesCount,
         recentDisputesRaw,
         violationStatusAgg,
         recentViolationReportsRaw,
         packageStats,
         recentTutorApplicationsRaw,
         adminWalletBalanceAgg,
      ] = await Promise.all([
         adminStatisticsService.getUserStatistics(),
         User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
         User.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select("name email role isBanned createdAt")
            .lean(),
         this.getTutorCounts(),
         LearningCommitment.aggregate([
            {
               $group: {
                  _id: "$status",
                  count: { $sum: 1 },
               },
            },
         ]),
         Payment.aggregate([
            {
               $match: {
                  type: "package",
               },
            },
            {
               $group: {
                  _id: "$status",
                  count: { $sum: 1 },
                  amount: { $sum: "$amount" },
               },
            },
         ]),
         Payment.aggregate(revenueTrendPipeline),
         Payment.find({
            status: { $in: SUCCESSFUL_PAYMENT_STATUSES },
            type: "package",
         })
            .sort({ createdAt: -1 })
            .limit(5)
            .select("orderCode amount status type createdAt")
            .lean(),
         Session.countDocuments({ "dispute.status": "OPEN" }),
         Session.countDocuments({ "dispute.status": "RESOLVED" }),
         Session.find({ "dispute.status": "OPEN" })
            .sort({ "dispute.openedAt": -1 })
            .limit(5)
            .select("learningCommitmentId startTime endTime dispute createdAt")
            .lean(),
         ViolationReport.aggregate([
            {
               $group: {
                  _id: "$status",
                  count: { $sum: 1 },
               },
            },
         ]),
         ViolationReport.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select(
               "type status reporterId reportedUserId relatedTeachingRequestId createdAt"
            )
            .lean(),
         adminUserService.getTutorPackageStats(),
         Tutor.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select("userId isApproved approvedAt rejectedAt createdAt")
            .populate({ path: "userId", select: "name email role isBanned" })
            .lean(),
         AdminWallet.aggregate([
            {
               $group: {
                  _id: null,
                  totalBalance: { $sum: "$balance" },
               },
            },
         ]),
      ]);

      const roleBreakdown = new Map<
         string,
         { total: number; active: number; banned: number }
      >();
      userStats.usersByRole.forEach((role) => {
         if (!role?._id) return;
         roleBreakdown.set(role._id, {
            total: role.count,
            active: role.active,
            banned: role.banned,
         });
      });

      const paymentsByStatusMap = new Map<
         string,
         { count: number; amount: number }
      >();
      paymentsByStatus.forEach((item) => {
         if (!item?._id) return;
         paymentsByStatusMap.set(item._id, {
            count: item.count,
            amount: item.amount,
         });
      });

      const packageRevenue = SUCCESSFUL_PAYMENT_STATUSES.reduce(
         (sum, status) => sum + (paymentsByStatusMap.get(status)?.amount || 0),
         0
      );
      const adminWalletBalance =
         adminWalletBalanceAgg?.[0]?.totalBalance || 0;
      const totalRevenue = packageRevenue + adminWalletBalance;
      const successfulTransactions = SUCCESSFUL_PAYMENT_STATUSES.reduce(
         (sum, status) => sum + (paymentsByStatusMap.get(status)?.count || 0),
         0
      );

      const revenueTrendMap = new Map<string, number>();
      revenueTrendRaw.forEach((item) => {
         if (!item?._id) return;
         const key =
            item._id instanceof Date
               ? formatDateKey(item._id)
               : String(item._id);
         revenueTrendMap.set(key, item.totalAmount || 0);
      });

      let revenueTrend: Array<{ date: string; amount: number }> = [];
      let dayKeys: string[] = [];
      if (trendRangeDays && trendRangeStart) {
         dayKeys = buildDateKeyRange(trendRangeStart, trendRangeDays);
         revenueTrend = dayKeys.map((key) => ({
            date: key,
            amount: revenueTrendMap.get(key) || 0,
         }));
      } else {
         revenueTrend = revenueTrendRaw.map((item) => ({
            date:
               item._id instanceof Date
                  ? formatDateKey(item._id)
                  : String(item._id),
            amount: item.totalAmount || 0,
         }));
      }

      const presetTrends: Record<string, Array<{ date: string; amount: number }>> =
         {};
      PRESET_TREND_RANGES.forEach((days) => {
         const presetStart = new Date(startOfToday);
         presetStart.setDate(startOfToday.getDate() - (days - 1));
         const presetKeys = buildDateKeyRange(presetStart, days);
         presetTrends[String(days)] = presetKeys.map((key) => ({
            date: key,
            amount: revenueTrendMap.get(key) || 0,
         }));
      });

      const revenueInRange = revenueTrend.reduce(
         (sum, day) => sum + day.amount,
         0
      );
      const presetRevenueTotals: Record<string, number> = {};
      PRESET_TREND_RANGES.forEach((days) => {
         const key = String(days);
         presetRevenueTotals[key] = presetTrends[key].reduce(
            (sum, item) => sum + item.amount,
            0
         );
      });

      const lastSevenDaysStart = new Date(startOfToday);
      lastSevenDaysStart.setDate(startOfToday.getDate() - 6);
      let revenueLast7Days = 0;
      for (let i = 0; i < 7; i += 1) {
         const date = new Date(lastSevenDaysStart);
         date.setDate(lastSevenDaysStart.getDate() + i);
         const key = formatDateKey(date);
         revenueLast7Days += revenueTrendMap.get(key) || 0;
      }

      const trendRangeStartLabel =
         trendRangeDays && trendRangeStart
            ? dayKeys[0] || formatDateKey(trendRangeStart)
            : revenueTrend.length > 0
               ? revenueTrend[0].date
               : null;
      const trendRangeEndLabel = formatDateKey(startOfToday);

      const learningCommitmentSummary = buildStatusSummary(
         learningCommitmentStatusAgg,
         [
            "pending_agreement",
            "active",
            "completed",
            "cancelled",
            "cancellation_pending",
            "admin_review",
            "rejected",
         ]
      );

      const violationReportSummary = buildStatusSummary(violationStatusAgg, [
         "PENDING",
         "REVIEWED",
         "RESOLVED",
         "REJECTED",
      ]);

      const recentPayments = recentPaymentsRaw.map((payment) => ({
         id: payment._id,
         orderCode: payment.orderCode,
         amount: payment.amount,
         status: payment.status,
         type: payment.type,
         createdAt: payment.createdAt,
      }));

      const recentUsers = latestUsers.map((user) => ({
         id: user._id,
         name: user.name,
         email: user.email,
         role: user.role,
         isBanned: user.isBanned,
         createdAt: user.createdAt,
      }));

      const recentDisputes = recentDisputesRaw.map((session) => ({
         id: session._id,
         learningCommitmentId: session.learningCommitmentId,
         startTime: session.startTime,
         endTime: session.endTime,
         dispute: session.dispute,
         createdAt: session.createdAt,
      }));

      const recentViolationReports = recentViolationReportsRaw.map((report) => ({
         id: report._id,
         type: report.type,
         status: report.status,
         reporterId: report.reporterId,
         reportedUserId: report.reportedUserId,
         relatedTeachingRequestId: report.relatedTeachingRequestId,
         createdAt: report.createdAt,
      }));

      const recentTutorApplications = recentTutorApplicationsRaw.map((tutor) => {
         const tutorUser = (tutor as any).userId;

         return {
            id: tutor._id,
            user: tutorUser
               ? {
                    id: tutorUser._id || tutorUser,
                    name: tutorUser.name,
                    email: tutorUser.email,
                    role: tutorUser.role,
                    isBanned: tutorUser.isBanned,
                 }
               : null,
            isApproved: tutor.isApproved,
            approvedAt: tutor.approvedAt,
            rejectedAt: tutor.rejectedAt,
            createdAt: tutor.createdAt,
         };
      });

      return {
         users: {
            total: userStats.totalUsers,
            active: userStats.activeUsers,
            banned: userStats.bannedUsers,
            newLast7Days: newUsersLast7Days,
            byRole: userStats.usersByRole.map((role) => ({
               role: role._id,
               total: role.count,
               active: role.active,
               banned: role.banned,
            })),
         },
         tutors: {
            total: roleBreakdown.get("TUTOR")?.total || 0,
            active: roleBreakdown.get("TUTOR")?.active || 0,
            banned: roleBreakdown.get("TUTOR")?.banned || 0,
            pendingApproval: tutorCounts.pendingApproval,
            approvedProfiles: tutorCounts.approved,
            rejectedProfiles: tutorCounts.rejected,
         },
         students: {
            total: roleBreakdown.get("STUDENT")?.total || 0,
            active: roleBreakdown.get("STUDENT")?.active || 0,
            banned: roleBreakdown.get("STUDENT")?.banned || 0,
         },
         learningCommitments: {
            total: Object.values(learningCommitmentSummary).reduce(
               (sum, count) => sum + count,
               0
            ),
            ...learningCommitmentSummary,
         },
         packages: packageStats,
         payments: {
            totalRevenue,
            revenueFromPackages: packageRevenue,
            adminWalletBalance,
            revenueInRange,
            revenueLast7Days,
            successfulTransactions,
            pendingCount: paymentsByStatusMap.get("PENDING")?.count || 0,
            failedCount:
               (paymentsByStatusMap.get("FAILED")?.count || 0) +
               (paymentsByStatusMap.get("CANCELLED")?.count || 0),
            refundedCount: paymentsByStatusMap.get("REFUNDED")?.count || 0,
            trend: revenueTrend,
            trendPresets: presetTrends,
            trendPresetTotals: presetRevenueTotals,
            trendRange: trendRangeSelection,
            trendRangeDays,
            trendRangeStart: trendRangeStartLabel,
            trendRangeEnd: trendRangeEndLabel,
            recent: recentPayments,
         },
         disputes: {
            open: openDisputesCount,
            resolved: resolvedDisputesCount,
            recent: recentDisputes,
         },
         violationReports: {
            summary: violationReportSummary,
            recent: recentViolationReports,
         },
         recentActivity: {
            users: recentUsers,
            tutorApplications: recentTutorApplications,
            payments: recentPayments,
            disputes: recentDisputes,
            violationReports: recentViolationReports,
         },
      };
   }

   private async getTutorCounts() {
      // Lấy tất cả tutors chưa approved, chưa reject, chưa bị report
      const pendingTutors = await Tutor.find({
         isApproved: false,
         rejectedAt: { $exists: false },
         hasBeenReported: { $ne: true },
      })
         .populate('userId', 'isBanned')
         .lean();

      // Filter out tutors có user bị banned
      const validPendingTutors = pendingTutors.filter((tutor: any) => {
         const user = tutor.userId;
         return user && !user.isBanned;
      });

      const [approved, rejected, banned] = await Promise.all([
         Tutor.countDocuments({ isApproved: true }),
         Tutor.countDocuments({ rejectedAt: { $ne: null } }),
         User.countDocuments({ role: "TUTOR", isBanned: true }),
      ]);

      return {
         pendingApproval: validPendingTutors.length,
         approved,
         rejected,
         banned,
      };
   }
}

export default new AdminDashboardService();


