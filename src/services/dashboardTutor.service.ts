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

   //  tổng session theo tất cả status của tutor đó
   public async getSessionStatusDistribution(userId: string) {
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      if (!tutor) throw new Error("Tutor profile not found");

      // Lấy tất cả session do user (tutor) tạo
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

   //  Dữ liệu cho Radar Chart - Phân tích môn học
   public async getSubjectAnalysis(userId: string) {
      const tutor = await Tutor.findOne({ userId })
         .select("_id subjects")
         .lean();
      if (!tutor) {
         throw new Error("Tutor profile not found");
      }
      const tutorId = (tutor as any)._id as Types.ObjectId;

      // 1. Lấy danh sách các môn tutor dạy
      const offeredSubjects = tutor.subjects || [];

      // 2. Đếm số lượng teaching request cho mỗi môn
      const requestCounts = await TeachingRequest.aggregate([
         { $match: { tutorId: tutorId } },
         {
            $group: {
               _id: "$subject",
               count: { $sum: 1 },
            },
         },
         {
            $project: {
               subject: "$_id",
               requests: "$count",
               _id: 0,
            },
         },
      ]);

      const requestMap = new Map(
         requestCounts.map((item) => [item.subject, item.requests])
      );

      // 3. Kết hợp dữ liệu
      const analysis = offeredSubjects.map((subject) => ({
         subject: subject,
         offered: 1, // Để vẽ trên radar chart, thể hiện là có offer
         requests: requestMap.get(subject) || 0,
      }));

      // Thêm các môn được yêu cầu nhưng không được offer vào kết quả
      requestMap.forEach((requests, subject) => {
         if (!offeredSubjects.includes(subject)) {
            analysis.push({
               subject: subject,
               offered: 0,
               requests: requests,
            });
         }
      });

      return { subjectAnalysis: analysis };
   }

   // Dữ liệu cho Bar Chart - Phân tích cấp độ đang dạy
   public async getLevelDistribution(userId: string) {
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      if (!tutor) {
         throw new Error("Tutor profile not found");
      }
      const tutorId = (tutor as any)._id as Types.ObjectId;

      const agg = await LearningCommitment.aggregate([
         {
            $match: {
               tutor: tutorId,
               status: "active", // Chỉ tính các cam kết đang hoạt động
            },
         },
         {
            $lookup: {
               from: "teaching_requests",
               localField: "teachingRequest",
               foreignField: "_id",
               as: "teachingRequestInfo",
            },
         },
         {
            $unwind: "$teachingRequestInfo",
         },
         {
            $group: {
               _id: "$teachingRequestInfo.level",
               count: { $sum: 1 },
            },
         },
         {
            $project: {
               level: "$_id",
               count: 1,
               _id: 0,
            },
         },
      ]);

      return { levelDistribution: agg };
   }
}

export default new DashboardService();
