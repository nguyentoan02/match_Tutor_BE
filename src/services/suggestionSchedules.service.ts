import LearningCommitment from "../models/learningCommitment.model";
import sessionModel from "../models/session.model";
import suggestSchedulesModel from "../models/suggestSchedules.model";
import teachingRequestModel from "../models/teachingRequest.model";
import { SuggesstionSchedules } from "../types/types/suggestionSchedules";
import { ISuggestionSchedules } from "../types/types/suggestionSchedules";
import { BadRequestError } from "../utils/error.response";
import { SessionStatus } from "../types/enums/session.enum";

class SuggestionSchedulesService {
   private isSameDayLocal(a: Date, b: Date) {
      return (
         a.getFullYear() === b.getFullYear() &&
         a.getMonth() === b.getMonth() &&
         a.getDate() === b.getDate()
      );
   }

   private findBusySessions(
      sessions: Array<{ startTime: Date; endTime: Date }>,
      suggestions: SuggesstionSchedules
   ) {
      return sessions.filter((session) =>
         suggestions.schedules.some((slot) => {
            const slotStart = new Date(slot.start);
            const slotEnd = new Date(slot.end);
            const sessionStart = new Date(session.startTime);
            const sessionEnd = new Date(session.endTime);

            const sameDay = this.isSameDayLocal(slotStart, sessionStart);

            return (
               sameDay &&
               slotStart.getTime() < sessionEnd.getTime() &&
               slotEnd.getTime() > sessionStart.getTime()
            );
         })
      );
   }
   async saveSuggestions(
      schedules: SuggesstionSchedules,
      tutorId: string
   ): Promise<ISuggestionSchedules> {
      const tr = await teachingRequestModel
         .findById(schedules.TRId)
         .select("studentId")
         .lean();

      const studentId = tr?.studentId;
      if (!studentId) {
         throw new BadRequestError("Không tìm thấy học sinh cho yêu cầu này");
      }

      const studentCommitment = await LearningCommitment.find({
         student: studentId,
      })
         .select("_id")
         .lean();
      const scList = studentCommitment.map((c) => c._id);
      const studentSessions = await sessionModel.find({
         learningCommitmentId: { $in: scList },
         isDeleted: { $ne: true },
         status: {
            $nin: [
               SessionStatus.REJECTED,
               SessionStatus.CANCELLED,
               SessionStatus.NOT_CONDUCTED,
            ],
         },
      });
      const busySessions = this.findBusySessions(
         studentSessions as Array<{ startTime: Date; endTime: Date }>,
         schedules
      );
      if (busySessions.length) {
         throw new BadRequestError(
            "không thể tạo lịch trùng với lịch bận của học sinh"
         );
      }
      const existed = await suggestSchedulesModel.exists({
         tutorId,
         teachingRequestId: schedules.TRId,
      });
      if (!existed) {
         const s = await suggestSchedulesModel.create({
            tutorId,
            schedules: schedules.schedules,
            title: schedules.title,
            teachingRequestId: schedules.TRId,
         });
         return s;
      }

      const s = await suggestSchedulesModel.findOneAndUpdate(
         { tutorId, teachingRequestId: schedules.TRId },
         {
            tutorId,
            schedules: schedules.schedules,
            title: schedules.title,
            teachingRequestId: schedules.TRId,
         },
         { new: true }
      );

      if (!s) {
         throw new Error("Suggestion schedules not found");
      }

      return s;
   }

   async getByTeachingRequest(TRid: string) {
      const result = await suggestSchedulesModel.findOne({
         teachingRequestId: TRid,
      });

      return result;
   }
}

export default new SuggestionSchedulesService();
