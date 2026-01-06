import { Types } from "mongoose";
import Tutor from "../models/tutor.model";
import Session from "../models/session.model";
import LearningCommitment from "../models/learningCommitment.model";
import { NotFoundError } from "../utils/error.response";
import { SessionStatus } from "../types/enums/session.enum";
import { getVietnamTime } from "../utils/date.util";

interface DateRange {
   startDate: Date;
   endDate: Date;
}

interface SessionQuery {
   startDate?: string;
   endDate?: string;
   view?: "week" | "month" | "year";
}

const VALID_TIME_FRAMES = ["PRE_12", "MID_12_17", "AFTER_17"] as const;

export class TutorScheduleService {
   /**
    * Tính toán date range dựa trên view hoặc custom dates
    */
   private calculateDateRange(query: SessionQuery): DateRange {
      const now = getVietnamTime();

      if (query.startDate && query.endDate) {
         return {
            startDate: new Date(query.startDate),
            endDate: new Date(query.endDate),
         };
      }

      switch (query.view) {
         case "week":
            return this.getWeekRange(now);
         case "month":
            return this.getMonthRange(now);
         case "year":
            return this.getYearRange(now);
         default:
            return this.getMonthRange(now);
      }
   }

   /**
    * Lấy tuần hiện tại (Thứ 2 - Chủ nhật)
    */
   private getWeekRange(now: Date): DateRange {
      const dayOfWeek = now.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      const startDate = new Date(now);
      startDate.setDate(now.getDate() - daysToMonday);
      startDate.setHours(0, 0, 0, 0);
      startDate.setMinutes(0, 0, 0);
      startDate.setSeconds(0, 0);

      const endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate };
   }

   /**
    * Lấy tháng hiện tại
    */
   private getMonthRange(now: Date): DateRange {
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate };
   }

   /**
    * Lấy năm hiện tại
    */
   private getYearRange(now: Date): DateRange {
      const startDate = new Date(now.getFullYear(), 0, 1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(now.getFullYear(), 11, 31);
      endDate.setHours(23, 59, 59, 999);

      return { startDate, endDate };
   }

   /**
    * Lấy commitment IDs của tutor
    */
   private async getTutorCommitmentIds(tutorId: string): Promise<Types.ObjectId[]> {
      const tutorObjectId = new Types.ObjectId(tutorId);
      const commitments = await LearningCommitment.find({ tutor: tutorObjectId }).select("_id");
      return commitments.map((c) => c._id as Types.ObjectId);
   }

   /**
    * Query sessions trong khoảng thời gian
    */
   private buildSessionQuery(commitmentIds: Types.ObjectId[], dateRange: DateRange) {
      return {
         learningCommitmentId: { $in: commitmentIds },
         status: { $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED] },
         isDeleted: { $ne: true },
         $or: [
            { startTime: { $gte: dateRange.startDate, $lte: dateRange.endDate } },
            { endTime: { $gte: dateRange.startDate, $lte: dateRange.endDate } },
            { startTime: { $lte: dateRange.startDate }, endTime: { $gte: dateRange.endDate } },
         ],
      };
   }

   /**
    * Format session data cho response
    */
   private formatSession(session: any) {
      const durationMs =
         new Date(session.endTime).getTime() - new Date(session.startTime).getTime();
      const durationHours = durationMs / (1000 * 60 * 60);

      return {
         _id: session._id,
         startTime: session.startTime,
         endTime: session.endTime,
         duration: Math.round(durationHours * 10) / 10,
         status: session.status,
         isBooked: true,
         subject: session.learningCommitmentId?.teachingRequest?.subject,
         level: session.learningCommitmentId?.teachingRequest?.level,
      };
   }

   /**
    * Format availability - chỉ trả về khung giờ rảnh (freeHours > 0)
    */
   private formatAvailability(availability: any[]) {
      if (!availability || !Array.isArray(availability)) {
         return [];
      }

      return availability
         .map((avail: any) => {
            if (!avail?.slots || !Array.isArray(avail.slots) || typeof avail.dayOfWeek !== "number") {
               return null;
            }

            const validSlots = avail.slots
               .map((slot: any) => {
                  // Hỗ trợ cả string và object format
                  const timeFrame = typeof slot === "string" ? slot : slot?.timeFrame || slot?.timeSlot;
                  const freeHours = typeof slot === "object" ? (slot.freeHours ?? 0) : 0;

                  // Chỉ giữ lại slot có timeFrame hợp lệ và freeHours > 0
                  if (!timeFrame || !VALID_TIME_FRAMES.includes(timeFrame) || freeHours <= 0) {
                     return null;
                  }

                  return {
                     timeFrame: timeFrame as "PRE_12" | "MID_12_17" | "AFTER_17",
                     freeHours,
                     freeMinutes: Math.round(freeHours * 60),
                  };
               })
               .filter((slot: any) => slot !== null);

            return validSlots.length > 0
               ? { dayOfWeek: avail.dayOfWeek, slots: validSlots }
               : null;
         })
         .filter((avail: any) => avail !== null);
   }

   /**
    * Get tutor sessions for public view
    * Trả về cả lịch dạy (sessions) và lịch rảnh (availability)
    */
   async getTutorSessionsForPublic(tutorId: string, query: SessionQuery) {
      const tutor = await Tutor.findById(tutorId)
         .populate("userId", "name avatarUrl")
         .lean();

      if (!tutor) {
         throw new NotFoundError("Tutor not found");
      }

      const dateRange = this.calculateDateRange(query);
      const formattedAvailability = this.formatAvailability(tutor.availability || []);
      const commitmentIds = await this.getTutorCommitmentIds(tutorId);

      let sessions: any[] = [];
      if (commitmentIds.length > 0) {
         sessions = await Session.find(this.buildSessionQuery(commitmentIds, dateRange))
            .populate({
               path: "learningCommitmentId",
               select: "teachingRequest",
               populate: {
                  path: "teachingRequest",
                  select: "subject level",
               },
            })
            .select("startTime endTime status")
            .sort({ startTime: 1 })
            .lean();
      }

      return {
         sessions: sessions.map((session) => this.formatSession(session)),
         tutor: {
            _id: tutor._id,
            name: (tutor.userId as any)?.name,
            avatarUrl: (tutor.userId as any)?.avatarUrl,
            availability: formattedAvailability,
         },
         dateRange: {
            startDate: dateRange.startDate,
            endDate: dateRange.endDate,
            view: query.view || "month",
         },
      };
   }
}

export default new TutorScheduleService();
