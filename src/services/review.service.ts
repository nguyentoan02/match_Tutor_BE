import Review from "../models/review.model";
import TeachingRequest from "../models/teachingRequest.model";
import Tutor from "../models/tutor.model";
import { IReview } from "../types/types/review";
import { ReviewTypeEnum } from "../types/enums/review.enum";
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
     * Create a review for a completed teaching request
     */
    async createReview(
        teachingRequestId: string,
        reviewerId: string,
        rating: number,
        comment?: string
    ): Promise<IReview> {
        // Validate teaching request exists and is completed
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
            throw new NotFoundError("Teaching request not found");
        }

        // Check if teaching request is completed
        if (teachingRequest.status !== TeachingRequestStatus.COMPLETED) {
            throw new BadRequestError(
                `Can only review completed teaching requests. Current status: ${teachingRequest.status}`
            );
        }
        type PopulatedTeachingRequest = ITeachingRequest & {
            studentId: IStudent & { userId: { _id: Types.ObjectId } };
            tutorId: ITutor & { userId: { _id: Types.ObjectId } };
        };

        const tr = teachingRequest as PopulatedTeachingRequest;

        // Verify the reviewer is the student of this teaching request
        if (tr.studentId.userId._id.toString() !== reviewerId) {
            throw new ForbiddenError("Only the student can review this teaching request");
        }

        if (!tr.tutorId?.userId) {
            throw new NotFoundError("Tutor information not found in teaching request");
        }

        const tutorId = tr.tutorId.userId._id;

        // Check if review already exists for this teaching request
        const existingReview = await Review.findOne({
            teachingRequestId: new Types.ObjectId(teachingRequestId),
            reviewerId: new Types.ObjectId(reviewerId),
        });

        if (existingReview) {
            throw new BadRequestError("You have already reviewed this teaching request");
        }

        // Create the review
        const review = new Review({
            type: ReviewTypeEnum.OVERALL,
            teachingRequestId: new Types.ObjectId(teachingRequestId),
            reviewerId: new Types.ObjectId(reviewerId),
            revieweeId: tutorId,
            rating,
            comment,
            isVisible: true,
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
     * Get reviews by teaching request
     */
    async getReviewsByTeachingRequest(teachingRequestId: string): Promise<IReview[]> {
        const reviews = await Review.find({
            teachingRequestId: new Types.ObjectId(teachingRequestId),
            isVisible: true,
        })
            .populate("reviewerId", "name avatarUrl")
            .sort({ createdAt: -1 })
            .lean();

        return reviews as IReview[];
    }

    /**
     * Get student's review for a specific teaching request
     */
    async getStudentReviewForTeachingRequest(
        teachingRequestId: string,
        studentId: string
    ): Promise<IReview | null> {
        const review = await Review.findOne({
            teachingRequestId: new Types.ObjectId(teachingRequestId),
            reviewerId: new Types.ObjectId(studentId),
        })
            .populate("reviewerId", "name avatarUrl")
            .populate("revieweeId", "name avatarUrl")
            .populate("teachingRequestId", "subject level")
            .lean();

        return review as IReview | null;
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
            throw new NotFoundError("Review not found");
        }

        // Verify the user owns this review
        if (review.reviewerId.toString() !== reviewerId) {
            throw new ForbiddenError("You can only update your own reviews");
        }

        // Update fields
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
    async deleteReview(reviewId: string, reviewerId: string): Promise<void> {
        const review = await Review.findById(reviewId);

        if (!review) {
            throw new NotFoundError("Review not found");
        }

        // Verify the user owns this review
        if (review.reviewerId.toString() !== reviewerId) {
            throw new ForbiddenError("You can only delete your own reviews");
        }

        review.isVisible = false;
        await review.save();
    }

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

}

export default new ReviewService();