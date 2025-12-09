import Tutor from "../../models/tutor.model";
import User from "../../models/user.model";
import LearningCommitment from "../../models/learningCommitment.model";
import Session from "../../models/session.model";
import TeachingRequest from "../../models/teachingRequest.model";
import ViolationReport from "../../models/violationReport.model";
import Review from "../../models/review.model";
import Student from "../../models/student.model";
import { NotFoundError } from "../../utils/error.response";
import { ITutor } from "../../types/types/tutor";
import { Types } from "mongoose";
import {
   GetTutorLearningCommitmentsQuery,
   GetTutorSessionsQuery,
   GetTutorTeachingRequestsQuery,
   GetTutorViolationReportsQuery,
   GetTutorReviewsQuery,
} from "../../schemas/admin.schema";

export class AdminTutorDetailsService {
   // Get full tutor details with summary statistics (for admin dashboard)
   async getTutorFullDetails(tutorId: string) {
      const tutor = await Tutor.findById(tutorId)
         .populate('userId', 'name email avatarUrl phone gender address role isBanned bannedAt banReason createdAt')
         .lean();

      if (!tutor) {
         throw new NotFoundError("Tutor profile not found");
      }

      const tutorUserId = (tutor.userId as any)?._id || tutor.userId;
      const tutorObjectId = tutor._id instanceof Types.ObjectId ? tutor._id : new Types.ObjectId(String(tutor._id));

      // Get commitment IDs for sessions query
      const commitmentIds = await LearningCommitment.find({ tutor: tutorObjectId }).distinct('_id');

      // Get summary statistics in parallel
      const [
         commitmentStats,
         sessionStats,
         teachingRequestStats,
         violationReportStats,
         reviewStats,
         activeCommitmentsCount,
         completedCommitmentsCount,
         totalReportsCount,
         averageRating
      ] = await Promise.all([
         // Learning commitment statistics by status
         LearningCommitment.aggregate([
            { $match: { tutor: tutorObjectId } },
            { $group: {
               _id: '$status',
               count: { $sum: 1 }
            }}
         ]),
         
         // Session statistics by status
         Session.aggregate([
            { $match: { learningCommitmentId: { $in: commitmentIds } } },
            { $group: {
               _id: '$status',
               count: { $sum: 1 }
            }}
         ]),
         
         // Teaching request statistics by status
         TeachingRequest.aggregate([
            { $match: { tutorId: tutorObjectId } },
            { $group: {
               _id: '$status',
               count: { $sum: 1 }
            }}
         ]),
         
         // Violation report statistics by status
         ViolationReport.aggregate([
            { $match: { reportedUserId: tutorUserId } },
            { $group: {
               _id: '$status',
               count: { $sum: 1 }
            }}
         ]),
         
         // Review statistics by rating
         Review.aggregate([
            { $match: { revieweeId: tutorUserId, isVisible: true } },
            { $group: {
               _id: '$rating',
               count: { $sum: 1 }
            }}
         ]),
         
         // Active commitments count
         LearningCommitment.countDocuments({ tutor: tutorObjectId, status: 'active' }),
         
         // Completed commitments count
         LearningCommitment.countDocuments({ tutor: tutorObjectId, status: 'completed' }),
         
         // Total reports count
         ViolationReport.countDocuments({ reportedUserId: tutorUserId }),
         
         // Average rating
         Review.aggregate([
            { $match: { revieweeId: tutorUserId, isVisible: true } },
            { $group: {
               _id: null,
               average: { $avg: '$rating' },
               total: { $sum: 1 }
            }}
         ])
      ]);

      return {
         tutor: tutor as ITutor,
         statistics: {
            commitments: {
               byStatus: commitmentStats.reduce((acc: any, stat: any) => {
                  acc[stat._id] = stat.count;
                  return acc;
               }, {}),
               active: activeCommitmentsCount,
               completed: completedCommitmentsCount
            },
            sessions: {
               byStatus: sessionStats.reduce((acc: any, stat: any) => {
                  acc[stat._id] = stat.count;
                  return acc;
               }, {})
            },
            teachingRequests: {
               byStatus: teachingRequestStats.reduce((acc: any, stat: any) => {
                  acc[stat._id] = stat.count;
                  return acc;
               }, {})
            },
            violationReports: {
               byStatus: violationReportStats.reduce((acc: any, stat: any) => {
                  acc[stat._id] = stat.count;
                  return acc;
               }, {}),
               total: totalReportsCount
            },
            reviews: {
               byRating: reviewStats.reduce((acc: any, stat: any) => {
                  acc[stat._id] = stat.count;
                  return acc;
               }, {}),
               average: averageRating.length > 0 ? averageRating[0].average : 0,
               total: averageRating.length > 0 ? averageRating[0].total : 0
            }
         }
      };
   }

   // Get tutor learning commitments with pagination
   async getTutorLearningCommitments(
      tutorId: string,
      query: GetTutorLearningCommitmentsQuery
   ) {
      const { page = 1, limit = 10, status, search } = query;
      const skip = (page - 1) * limit;

      const tutorObjectId = new Types.ObjectId(tutorId);
      const filter: any = { tutor: tutorObjectId };

      if (status) {
         filter.status = status;
      }

      if (search) {
         // Search by student name through User model
         const users = await User.find({
            name: { $regex: search, $options: 'i' }
         }).distinct('_id');
         const students = await Student.find({
            userId: { $in: users }
         }).distinct('_id');
         filter.student = { $in: students };
      }

      const [commitments, total] = await Promise.all([
         LearningCommitment.find(filter)
            .populate({
               path: 'student',
               populate: { path: 'userId', select: 'name email' }
            })
            .populate('teachingRequest')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         LearningCommitment.countDocuments(filter)
      ]);

      return {
         commitments,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
         }
      };
   }

   // Get tutor sessions with pagination
   async getTutorSessions(
      tutorId: string,
      query: GetTutorSessionsQuery
   ) {
      const { page = 1, limit = 10, status, startDate, endDate } = query;
      const skip = (page - 1) * limit;

      const tutorObjectId = new Types.ObjectId(tutorId);
      const commitmentIds = await LearningCommitment.find({ tutor: tutorObjectId }).distinct('_id');

      const filter: any = { learningCommitmentId: { $in: commitmentIds } };

      if (status) {
         filter.status = status;
      }

      if (startDate || endDate) {
         filter.startTime = {};
         if (startDate) filter.startTime.$gte = new Date(startDate);
         if (endDate) filter.startTime.$lte = new Date(endDate);
      }

      const [sessions, total] = await Promise.all([
         Session.find(filter)
            .populate({
               path: 'learningCommitmentId',
               populate: [
                  {
                     path: 'student',
                     populate: { path: 'userId', select: 'name email' }
                  },
                  {
                     path: 'teachingRequest',
                     select: 'subject level'
                  }
               ]
            })
            .sort({ startTime: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         Session.countDocuments(filter)
      ]);

      return {
         sessions,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
         }
      };
   }

   // Get tutor teaching requests with pagination
   async getTutorTeachingRequests(
      tutorId: string,
      query: GetTutorTeachingRequestsQuery
   ) {
      const { page = 1, limit = 10 } = query;
      const { status, search } = query;
      const skip = (page - 1) * limit;

      const tutorObjectId = new Types.ObjectId(tutorId);
      const filter: any = { tutorId: tutorObjectId };

      if (status) {
         filter.status = status;
      }

      if (search) {
         // Search by student name through User model
         const users = await User.find({
            name: { $regex: search, $options: 'i' }
         }).distinct('_id');
         const students = await Student.find({
            userId: { $in: users }
         }).distinct('_id');
         filter.studentId = { $in: students };
      }

      const [teachingRequests, total] = await Promise.all([
         TeachingRequest.find(filter)
            .populate({
               path: 'studentId',
               populate: { path: 'userId', select: 'name email' }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         TeachingRequest.countDocuments(filter)
      ]);

      return {
         teachingRequests,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
         }
      };
   }

   // Get tutor violation reports with pagination
   async getTutorViolationReports(
      tutorId: string,
      query: GetTutorViolationReportsQuery
   ) {
      const { page = 1, limit = 10 } = query;
      const { status } = query;
      const skip = (page - 1) * limit;

      const tutor = await Tutor.findById(tutorId).select('userId').lean();
      if (!tutor) {
         throw new NotFoundError("Tutor profile not found");
      }

      const tutorUserId = (tutor.userId as any)?._id || tutor.userId;
      const filter: any = { reportedUserId: tutorUserId };

      if (status) {
         filter.status = status;
      }

      const [reports, total] = await Promise.all([
         ViolationReport.find(filter)
            .populate('reporterId', 'name email')
            .populate('relatedTeachingRequestId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         ViolationReport.countDocuments(filter)
      ]);

      return {
         reports,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
         }
      };
   }

   // Get tutor reviews with pagination
   async getTutorReviews(
      tutorId: string,
      query: GetTutorReviewsQuery
   ) {
      const { page = 1, limit = 10 } = query;
      const { rating } = query;
      const { type } = query;
      const skip = (page - 1) * limit;

      const tutor = await Tutor.findById(tutorId).select('userId').lean();
      if (!tutor) {
         throw new NotFoundError("Tutor profile not found");
      }

      const tutorUserId = (tutor.userId as any)?._id || tutor.userId;
      const filter: any = { revieweeId: tutorUserId, isVisible: true };

      if (rating) {
         filter.rating = rating;
      }

      if (type) {
         filter.type = type;
      }

      const [reviews, total] = await Promise.all([
         Review.find(filter)
            .populate('reviewerId', 'name email')
            .populate('teachingRequestId')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         Review.countDocuments(filter)
      ]);

      return {
         reviews,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
         }
      };
   }

   // Get tutor statistics
   async getTutorStatistics(tutorId: string) {
      const tutor = await Tutor.findById(tutorId).select('userId').lean();
      if (!tutor) {
         throw new NotFoundError("Tutor profile not found");
      }

      const tutorUserId = (tutor.userId as any)?._id || tutor.userId;
      const tutorObjectId = new Types.ObjectId(tutorId);
      const commitmentIds = await LearningCommitment.find({ tutor: tutorObjectId }).distinct('_id');

      const [
         commitmentStats,
         sessionStats,
         teachingRequestStats,
         violationReportStats,
         reviewStats,
         ratingDistribution
      ] = await Promise.all([
         LearningCommitment.aggregate([
            { $match: { tutor: tutorObjectId } },
            { $group: {
               _id: '$status',
               count: { $sum: 1 }
            }}
         ]),
         Session.aggregate([
            { $match: { learningCommitmentId: { $in: commitmentIds } } },
            { $group: {
               _id: '$status',
               count: { $sum: 1 }
            }}
         ]),
         TeachingRequest.aggregate([
            { $match: { tutorId: tutorObjectId } },
            { $group: {
               _id: '$status',
               count: { $sum: 1 }
            }}
         ]),
         ViolationReport.aggregate([
            { $match: { reportedUserId: tutorUserId } },
            { $group: {
               _id: '$status',
               count: { $sum: 1 }
            }}
         ]),
         Review.aggregate([
            { $match: { revieweeId: tutorUserId, isVisible: true } },
            { $group: {
               _id: null,
               average: { $avg: '$rating' },
               total: { $sum: 1 }
            }}
         ]),
         Review.aggregate([
            { $match: { revieweeId: tutorUserId, isVisible: true } },
            { $group: {
               _id: '$rating',
               count: { $sum: 1 }
            }},
            { $sort: { _id: -1 } }
         ])
      ]);

      return {
         commitments: {
            byStatus: commitmentStats.reduce((acc: any, stat: any) => {
               acc[stat._id] = stat.count;
               return acc;
            }, {})
         },
         sessions: {
            byStatus: sessionStats.reduce((acc: any, stat: any) => {
               acc[stat._id] = stat.count;
               return acc;
            }, {})
         },
         teachingRequests: {
            byStatus: teachingRequestStats.reduce((acc: any, stat: any) => {
               acc[stat._id] = stat.count;
               return acc;
            }, {})
         },
         violationReports: {
            byStatus: violationReportStats.reduce((acc: any, stat: any) => {
               acc[stat._id] = stat.count;
               return acc;
            }, {})
         },
         reviews: {
            average: reviewStats.length > 0 ? reviewStats[0].average : 0,
            total: reviewStats.length > 0 ? reviewStats[0].total : 0,
            distribution: ratingDistribution.reduce((acc: any, stat: any) => {
               acc[stat._id] = stat.count;
               return acc;
            }, {})
         }
      };
   }
}

export default new AdminTutorDetailsService();
