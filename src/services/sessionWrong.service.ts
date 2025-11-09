import Session from "../models/session.model";
import Tutor from "../models/tutor.model";
import Student from "../models/student.model";
import LearningCommitment from "../models/learningCommitment.model";
import { SessionStatus } from "../types/enums/session.enum";
import { NotFoundError, BadRequestError } from "../utils/error.response";

class SessionWrongService {
   /**
    * Lấy danh sách các buổi học vắng của user (tutor hoặc student)
    * @param userId - ID của user
    * @returns Mảng các session có vắng
    */
   async listAbsenceSessionsForUser(userId: string) {
      const tutor = await Tutor.findOne({ userId }).select("_id").lean();
      const student = await Student.findOne({ userId }).select("_id").lean();

      const commitments = await LearningCommitment.find({
         $or: [{ tutor: tutor?._id }, { student: student?._id }],
      })
         .select("_id")
         .lean();
      const commitmentIds = commitments.map((c) => c._id);

      if (commitmentIds.length === 0) return [];

      const sessions = await Session.find({
         status: SessionStatus.NOT_CONDUCTED,
         $or: [
            { "absence.tutorAbsent": true },
            { "absence.studentAbsent": true },
         ],
         learningCommitmentId: { $in: commitmentIds },
      })
         .populate({
            path: "learningCommitmentId",
            select: "student tutor teachingRequest",
            populate: [
               {
                  path: "student",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name email avatarUrl role",
                  },
               },
               {
                  path: "tutor",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name email avatarUrl role",
                  },
               },
               {
                  path: "teachingRequest",
                  select: "subject level",
               },
            ],
         })
         .populate({ path: "createdBy", select: "_id name" })
         .sort({ endTime: -1 })
         .lean();

      return sessions;
   }
}

export default new SessionWrongService();
