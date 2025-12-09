import Review from "../models/review.model";
import TeachingRequest from "../models/teachingRequest.model";
import Tutor from "../models/tutor.model";
import Student from "../models/student.model";
import LearningCommitment from "../models/learningCommitment.model"; // Import LearningCommitment
import { IReview } from "../types/types/review";
import { ReviewTypeEnum, ReviewVisibilityRequestStatusEnum } from "../types/enums/review.enum";
import { TeachingRequestStatus } from "../types/enums/teachingRequest.enum";
import {
   NotFoundError,
   BadRequestError,
   ForbiddenError
} from "../utils/error.response";
import { Types } from "mongoose";
import { ITeachingRequest } from "../types/types/teachingRequest";
import { IStudent } from "../types/types/student";
import { ITutor } from "../types/types/tutor";

export class ReviewService {
   /**
    * Create a review for a completed learning commitment
    */
   async createReview(
      teachingRequestId: string,
      reviewerId: string,
      rating: number,
      comment?: string
   ): Promise<IReview> {
      // Validate teaching request exists
      const teachingRequest = await TeachingRequest.findById(teachingRequestId)
         .populate({
            path: "studentId",
            populate: { path: "userId", select: "_id" }
         })
         .populate({
            path: "tutorId",
            populate: { path: "userId", select: "_id" }
         })
         .lean<PopulatedTeachingRequest | null>();

      if (!teachingRequest) {
         throw new NotFoundError("Không tìm thấy yêu cầu học");
      }

      type PopulatedTeachingRequest = ITeachingRequest & {
         studentId: IStudent & { userId: { _id: Types.ObjectId } };
         tutorId: ITutor & { userId: { _id: Types.ObjectId } };
      };

      const tr = teachingRequest as PopulatedTeachingRequest;

      // Verify the reviewer is the student of this teaching request
      if (tr.studentId.userId._id.toString() !== reviewerId) {
         throw new ForbiddenError(
            "Chỉ học viên đã hoàn thành yêu cầu học này mới được phép đánh giá"
         );
      }

      if (!tr.tutorId?.userId) {
         throw new NotFoundError(
            "Không tìm thấy thông tin gia sư trong yêu cầu học"
         );
      }

      const tutorId = tr.tutorId.userId._id;

      // Find the learning commitment for this teaching request
      const learningCommitment = await LearningCommitment.findOne({
         teachingRequest: new Types.ObjectId(teachingRequestId),
         student: tr.studentId._id,
         tutor: tr.tutorId._id
      });

      if (!learningCommitment) {
         throw new NotFoundError(
            "Không tìm thấy cam kết học cho yêu cầu học này"
         );
      }

      // Check if learning commitment is completed
      if (learningCommitment.status !== "completed") {
         throw new BadRequestError(
            `Chỉ có thể đánh giá khi cam kết học đã hoàn thành. Trạng thái hiện tại: ${learningCommitment.status}`
         );
      }

      // Check if review already exists for this teaching request
      const existingReview = await Review.findOne({
         reviewerId: new Types.ObjectId(reviewerId),
         revieweeId: tutorId,
         teachingRequestId: new Types.ObjectId(teachingRequestId),
         isVisible: true
      });

      if (existingReview) {
         throw new BadRequestError("Bạn đã đánh giá yêu cầu học này trước đó");
      }

      // Create the review
      const review = new Review({
         type: ReviewTypeEnum.OVERALL,
         teachingRequestId: new Types.ObjectId(teachingRequestId),
         reviewerId: new Types.ObjectId(reviewerId),
         revieweeId: tutorId,
         rating,
         comment,
         isVisible: true
      });

      await review.save();

      const populatedReview = await Review.findById(review._id)
         .populate("reviewerId", "name avatarUrl")
         .populate("revieweeId", "name avatarUrl")
         .populate("teachingRequestId", "subject level")
         .lean();

      return populatedReview as IReview;
   }

   /**
    * Get reviews for a tutor
    */
   async getTutorReviews(tutorId: string): Promise<IReview[]> {
      const reviews = await Review.find({
         revieweeId: new Types.ObjectId(tutorId),
         isVisible: true,
      })
         .populate("reviewerId", "name avatarUrl")
         .populate("teachingRequestId", "subject level")
         .sort({ createdAt: -1 })
         .lean();

      return reviews as IReview[];
   }

   /**
    * Get tutor reviews (by userId)
    * Supports paging, search, and filters for:
    * - reviewer name
    * - comment keyword
    * - subject
    * - level
    * - rating range
    * - sort order (newest or oldest)
    */
   async getTutorReviewsByUserId(
      tutorUserId: string,
      filters: {
         page?: number;
         limit?: number;
         keyword?: string; // search by comment or reviewer name
         subjects?: string[];
         levels?: string[];
         minRating?: number;
         maxRating?: number;
         sort?: "newest" | "oldest";
         rating?: string; // specific rating filter
      }
   ) {
      const {
         page = 1,
         limit = 10,
         keyword = "",
         subjects = [],
         levels = [],
         minRating = 0,
         maxRating = 5,
         sort = "newest",
         rating, // specific rating
      } = filters;

      const skip = (page - 1) * limit;

      // Find tutor document by userId
      const tutor = await Tutor.findOne({ userId: new Types.ObjectId(tutorUserId) });
      if (!tutor) {
         throw new NotFoundError("Tutor profile not found");
      }

      // Build match conditions
      const match: any = {
         revieweeId: new Types.ObjectId(tutorUserId),
         isVisible: true,
      };

      // Rating filtering
      if (rating) {
         // Specific rating filter (like "5" for 5 stars)
         match.rating = Number(rating);
      } else {
         // Rating range filter
         match.rating = { $gte: minRating, $lte: maxRating };
      }

      // Build aggregate pipeline
      const pipeline: any[] = [
         { $match: match },
         {
            $lookup: {
               from: "users",
               localField: "reviewerId",
               foreignField: "_id",
               as: "reviewerId",
            },
         },
         { $unwind: "$reviewerId" },
         {
            $lookup: {
               from: "teaching_requests",
               localField: "teachingRequestId",
               foreignField: "_id",
               as: "teachingRequestId",
            },
         },
         { $unwind: { path: "$teachingRequestId", preserveNullAndEmptyArrays: true } },
      ];

      // Filter by subject or level
      const andConditions: any[] = [];

      if (subjects.length > 0) {
         andConditions.push({
            "teachingRequestId.subject": { $in: subjects },
         });
      }

      if (levels.length > 0) {
         andConditions.push({
            "teachingRequestId.level": { $in: levels },
         });
      }

      // Keyword search in reviewer name 
      if (keyword) {
         andConditions.push({
            $or: [
               { "reviewerId.name": { $regex: keyword, $options: "i" } },
            ],
         });
      }

      if (andConditions.length > 0) {
         pipeline.push({ $match: { $and: andConditions } });
      }

      // Add sort
      pipeline.push({
         $sort: { createdAt: sort === "newest" ? -1 : 1 },
      });

      // Count total before pagination
      const countPipeline = [...pipeline];
      countPipeline.push({ $count: "total" });
      const countResult = await Review.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      // Apply pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      // Select fields to return
      pipeline.push({
         $project: {
            _id: 1,
            rating: 1,
            comment: 1,
            createdAt: 1,
            "reviewerId._id": 1,
            "reviewerId.name": 1,
            "reviewerId.avatarUrl": 1,
            "teachingRequestId.subject": 1,
            "teachingRequestId.level": 1,
         },
      });

      const reviews = await Review.aggregate(pipeline);

      return {
         total,
         page,
         limit,
         totalPages: Math.ceil(total / limit),
         reviews,
      };
   }

   /**
    * Tutor requests to hide a review (sends to admin)
    */
   async requestHideReview(
      reviewId: string,
      tutorUserId: string,
      reason?: string
   ): Promise<IReview> {
      const review = await Review.findById(reviewId);
      if (!review) {
         throw new NotFoundError("Không tìm thấy đánh giá");
      }

      if (review.revieweeId.toString() !== tutorUserId) {
         throw new ForbiddenError("Bạn chỉ có thể yêu cầu ẩn đánh giá của mình");
      }

      if (!review.isVisible) {
         throw new BadRequestError("Đánh giá này đã bị ẩn");
      }

      if (review.visibilityRequestStatus === ReviewVisibilityRequestStatusEnum.PENDING) {
         throw new BadRequestError("Yêu cầu ẩn đánh giá đang được xử lý");
      }

      review.visibilityRequestStatus = ReviewVisibilityRequestStatusEnum.PENDING;
      review.visibilityRequestReason = reason;
      review.visibilityRequestAdminNote = undefined;
      review.visibilityReviewedAt = undefined;
      review.visibilityReviewedBy = undefined;

      await review.save();

      const populated = await Review.findById(review._id)
         .populate("reviewerId", "name avatarUrl")
         .populate("revieweeId", "name avatarUrl")
         .populate("teachingRequestId", "subject level")
         .lean();

      return populated as IReview;
   }

   /**
    * Admin handles a tutor's hide-review request
    */
   async handleVisibilityRequest(
      reviewId: string,
      adminUserId: string,
      action: "approve" | "reject" | "restore",
      adminNote?: string
   ): Promise<IReview> {
      const review = await Review.findById(reviewId);

      if (!review) {
         throw new NotFoundError("Không tìm thấy đánh giá");
      }

      review.visibilityRequestAdminNote = adminNote;
      review.visibilityReviewedAt = new Date();
      review.visibilityReviewedBy = new Types.ObjectId(adminUserId);

      if (action === "approve") {
         if (review.visibilityRequestStatus !== ReviewVisibilityRequestStatusEnum.PENDING) {
            throw new BadRequestError("Đánh giá này không có yêu cầu ẩn cần xử lý");
         }
         review.visibilityRequestStatus = ReviewVisibilityRequestStatusEnum.APPROVED;
         review.isVisible = false;
      } else if (action === "reject") {
         if (review.visibilityRequestStatus !== ReviewVisibilityRequestStatusEnum.PENDING) {
            throw new BadRequestError("Đánh giá này không có yêu cầu ẩn cần xử lý");
         }
         review.visibilityRequestStatus = ReviewVisibilityRequestStatusEnum.REJECTED;
         review.isVisible = true;
      } else if (action === "restore") {
         if (review.visibilityRequestStatus !== ReviewVisibilityRequestStatusEnum.APPROVED) {
            throw new BadRequestError("Chỉ có thể bật lại review đã được ẩn");
         }
         review.visibilityRequestStatus = ReviewVisibilityRequestStatusEnum.REJECTED;
         review.isVisible = true;
      }

      await review.save();

      if (action === "approve" || action === "restore") {
         await this.recalculateTutorRatings(review.revieweeId as Types.ObjectId);
      }

      const populated = await Review.findById(review._id)
         .populate("reviewerId", "name avatarUrl")
         .populate("revieweeId", "name avatarUrl")
         .populate("teachingRequestId", "subject level")
         .lean();

      return populated as IReview;
   }

   /**
    * Admin: list visibility requests
    */
   async getVisibilityRequests(filters: {
      status?: ReviewVisibilityRequestStatusEnum;
      page?: number;
      limit?: number;
      tutorUserId?: string;
   }) {
      const { status, page = 1, limit = 10, tutorUserId } = filters || {};

      const query: any = {};

      if (status) {
         query.visibilityRequestStatus = status;
      } else {
         // Không truyền status -> lấy tất cả yêu cầu đã được tạo (PENDING/APPROVED/REJECTED)
         query.visibilityRequestStatus = {
            $in: [
               ReviewVisibilityRequestStatusEnum.PENDING,
               ReviewVisibilityRequestStatusEnum.APPROVED,
               ReviewVisibilityRequestStatusEnum.REJECTED,
            ],
         };
      }

      if (tutorUserId) {
         query.revieweeId = new Types.ObjectId(tutorUserId);
      }

      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
         Review.find(query)
            .populate("reviewerId", "name email avatarUrl")
            .populate("revieweeId", "name email avatarUrl")
            .populate("teachingRequestId", "subject level")
            .sort({
               createdAt: -1,
            })
            .skip(skip)
            .limit(limit)
            .lean(),
         Review.countDocuments(query),
      ]);

      return {
         reviews,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   /**
    * Update a review
    */
   async updateReview(
      reviewId: string,
      reviewerId: string,
      updates: { rating?: number; comment?: string }
   ): Promise<IReview> {
      const review = await Review.findById(reviewId);

      if (!review) {
         throw new NotFoundError("Không tìm thấy đánh giá");
      }

      // Kiểm tra người dùng có phải là chủ review này không
      if (review.reviewerId.toString() !== reviewerId) {
         throw new ForbiddenError("Bạn chỉ có thể cập nhật đánh giá của chính mình");
      }

      // Kiểm tra nếu review đã hơn 24 giờ
      if (!review.createdAt) {
         throw new BadRequestError("Ngày tạo đánh giá không tồn tại");
      }
      const now = new Date();
      const timeSinceCreation = now.getTime() - review.createdAt.getTime();
      const hoursPassed = timeSinceCreation / (1000 * 60 * 60);

      if (hoursPassed > 24) {
         throw new ForbiddenError("Bạn chỉ có thể chỉnh sửa đánh giá trong vòng 24 giờ sau khi đăng");
      }

      // Cập nhật các trường
      if (updates.rating !== undefined) {
         review.rating = updates.rating;
      }
      if (updates.comment !== undefined) {
         review.comment = updates.comment;
      }

      await review.save();

      const updatedReview = await Review.findById(review._id)
         .populate("reviewerId", "name avatarUrl")
         .populate("revieweeId", "name avatarUrl")
         .populate("teachingRequestId", "subject level")
         .lean();

      return updatedReview as IReview;
   }


   /**
    * Delete a review (soft delete by setting isVisible to false)
    */
   // async deleteReview(reviewId: string, reviewerId: string): Promise<void> {
   //     const review = await Review.findById(reviewId);

   //     if (!review) {
   //         throw new NotFoundError("Review not found");
   //     }

   //     // Verify the user owns this review
   //     if (review.reviewerId.toString() !== reviewerId) {
   //         throw new ForbiddenError("You can only delete your own reviews");
   //     }

   //     review.isVisible = false;
   //     await review.save();
   // }

   /**
    * Get tutor's average rating and review count
    */
   async getTutorRatingStats(tutorId: string): Promise<{
      averageRating: number;
      totalReviews: number;
      ratingDistribution: { [key: number]: number };
   }> {
      const stats = await Review.aggregate([
         {
            $match: {
               revieweeId: new Types.ObjectId(tutorId),
               isVisible: true,
            },
         },
         {
            $group: {
               _id: null,
               averageRating: { $avg: "$rating" },
               totalReviews: { $sum: 1 },
               ratingDistribution: {
                  $push: "$rating",
               },
            },
         },
      ]);

      if (stats.length === 0) {
         return {
            averageRating: 0,
            totalReviews: 0,
            ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
         };
      }

      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      stats[0].ratingDistribution.forEach((rating: number) => {
         ratingDistribution[rating as keyof typeof ratingDistribution]++;
      });

      return {
         averageRating: Math.round(stats[0].averageRating * 10) / 10,
         totalReviews: stats[0].totalReviews,
         ratingDistribution,
      };
   }

   /**
    * Get all reviews written by a student with filtering
    */
   async getStudentReviewHistory(
      studentUserId: string,
      filters?: {
         page?: number;
         limit?: number;
         keyword?: string; // search by tutor name or comment
         subjects?: string[];
         levels?: string[];
         minRating?: number;
         maxRating?: number;
         sort?: "newest" | "oldest";
         rating?: string; // specific rating filter
      }
   ) {
      const {
         page = 1,
         limit = 10,
         keyword = "",
         subjects = [],
         levels = [],
         minRating = 0,
         maxRating = 5,
         sort = "newest",
         rating,
      } = filters || {};

      const skip = (page - 1) * limit;

      // Build match conditions
      const match: any = {
         reviewerId: new Types.ObjectId(studentUserId),
         isVisible: true,
      };

      // Rating filtering
      if (rating) {
         match.rating = Number(rating);
      } else {
         match.rating = { $gte: minRating, $lte: maxRating };
      }

      // Build aggregate pipeline
      const pipeline: any[] = [
         { $match: match },
         {
            $lookup: {
               from: "users",
               localField: "revieweeId",
               foreignField: "_id",
               as: "revieweeId",
            },
         },
         { $unwind: "$revieweeId" },
         {
            $lookup: {
               from: "teaching_requests",
               localField: "teachingRequestId",
               foreignField: "_id",
               as: "teachingRequestId",
            },
         },
         { $unwind: { path: "$teachingRequestId", preserveNullAndEmptyArrays: true } },
      ];

      // Filter by subject, level, and keyword
      const andConditions: any[] = [];

      // Normalize subjects and levels
      const normalizedSubjects = Array.isArray(subjects) ? subjects :
         (typeof subjects === 'string' && subjects ? [subjects] : []);
      const normalizedLevels = Array.isArray(levels) ? levels :
         (typeof levels === 'string' && levels ? [levels] : []);

      if (normalizedSubjects.length > 0) {
         andConditions.push({
            "teachingRequestId.subject": { $in: normalizedSubjects },
         });
      }

      if (normalizedLevels.length > 0) {
         andConditions.push({
            "teachingRequestId.level": { $in: normalizedLevels },
         });
      }

      // Keyword search in tutor name 
      if (keyword) {
         andConditions.push({
            $or: [
               { "revieweeId.name": { $regex: keyword, $options: "i" } },
            ],
         });
      }

      if (andConditions.length > 0) {
         pipeline.push({ $match: { $and: andConditions } });
      }

      // Add sort
      pipeline.push({
         $sort: { createdAt: sort === "newest" ? -1 : 1 },
      });

      // Count total before pagination
      const countPipeline = [...pipeline];
      countPipeline.push({ $count: "total" });
      const countResult = await Review.aggregate(countPipeline);
      const total = countResult[0]?.total || 0;

      // Apply pagination
      pipeline.push({ $skip: skip });
      pipeline.push({ $limit: limit });

      // Select fields to return
      pipeline.push({
         $project: {
            _id: 1,
            rating: 1,
            comment: 1,
            createdAt: 1,
            "revieweeId._id": 1,
            "revieweeId.name": 1,
            "revieweeId.avatarUrl": 1,
            "teachingRequestId.subject": 1,
            "teachingRequestId.level": 1,
         },
      });

      const reviews = await Review.aggregate(pipeline);

      return {
         total,
         page,
         limit,
         totalPages: Math.ceil(total / limit),
         reviews,
      };
   }
   /**
    * Check if student has completed learning commitments with a tutor
    */
   async checkReviewEligibility(
      studentUserId: string,
      tutorUserId: string
   ): Promise<{
      hasCompleted: boolean;
      teachingRequestIds: string[];
      learningCommitments?: any[];
   }> {
      const student = await Student.findOne({ userId: new Types.ObjectId(studentUserId) }).select("_id");
      if (!student) {
         throw new NotFoundError("Student profile not found");
      }

      // Find completed learning commitments between this student and tutor
      const completedCommitments = await LearningCommitment.find({
         student: student._id,
         tutor: tutorUserId,
         status: "completed"
      }).populate("teachingRequest", "_id").lean();

      const teachingRequestIds = completedCommitments
         .filter(commitment => commitment.teachingRequest)
         .map(commitment => commitment.teachingRequest._id.toString());

      return {
         hasCompleted: completedCommitments.length > 0,
         teachingRequestIds,
         learningCommitments: completedCommitments
      };
   }

   private async recalculateTutorRatings(tutorUserId: Types.ObjectId) {
      const stats = await Review.aggregate([
         { $match: { revieweeId: tutorUserId, isVisible: true } },
         {
            $group: {
               _id: "$revieweeId",
               average: { $avg: "$rating" },
               totalReviews: { $sum: 1 },
            },
         },
      ]);

      if (stats.length > 0) {
         await Tutor.findOneAndUpdate(
            { userId: tutorUserId },
            {
               "ratings.average": stats[0].average,
               "ratings.totalReviews": stats[0].totalReviews,
            },
            { new: true }
         );
      } else {
         await Tutor.findOneAndUpdate(
            { userId: tutorUserId },
            { "ratings.average": 0, "ratings.totalReviews": 0 },
            { new: true }
         );
      }
   }
}

export default new ReviewService();