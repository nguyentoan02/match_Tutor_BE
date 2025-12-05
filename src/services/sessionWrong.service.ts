import Session from "../models/session.model";
import Tutor from "../models/tutor.model";
import Student from "../models/student.model";
import LearningCommitment from "../models/learningCommitment.model";
import { SessionStatus } from "../types/enums/session.enum";
import { NotFoundError, BadRequestError } from "../utils/error.response";
import tutorModel from "../models/tutor.model";
import studentModel from "../models/student.model";

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

   async listDeletedRejectedForUser(userId: string) {
      const tutor = await tutorModel.findOne({ userId }).select("_id").lean();
      const student = await studentModel
         .findOne({ userId })
         .select("_id")
         .lean();

      const commitments = await LearningCommitment.find({
         $or: [{ tutor: tutor?._id }, { student: student?._id }],
      })
         .select("_id")
         .lean();
      const commitmentIds = commitments.map((c) => c._id);

      if (commitmentIds.length === 0) return [];

      const sessions = await Session.find({
         status: SessionStatus.REJECTED,
         isDeleted: true,
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
         .populate({
            path: "createdBy",
            select: "_id name email role avatarUrl",
         })
         .populate({
            path: "deletedBy",
            select: "_id name email role avatarUrl",
         })
         .sort({ startTime: -1 })
         .lean();

      return sessions;
   }

   async listCancelledForUser(userId: string) {
      const tutor = await tutorModel.findOne({ userId }).select("_id").lean();
      const student = await studentModel
         .findOne({ userId })
         .select("_id")
         .lean();

      const commitments = await LearningCommitment.find({
         $or: [{ tutor: tutor?._id }, { student: student?._id }],
      })
         .select("_id")
         .lean();
      const commitmentIds = commitments.map((c) => c._id);

      if (commitmentIds.length === 0) return [];

      const sessions = await Session.find({
         status: SessionStatus.CANCELLED,
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
         .populate({
            path: "createdBy",
            select: "_id name email role avatarUrl",
         })
         .populate({
            path: "cancellation.cancelledBy",
            select: "_id name email role avatarUrl",
         })
         .sort({ "cancellation.cancelledAt": -1 })
         .lean();

      return sessions;
   }
}

export default new SessionWrongService();
