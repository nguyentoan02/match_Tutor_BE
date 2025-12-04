import { Request, Response, NextFunction } from "express";
import reviewService from "../services/review.service";
import { OK, CREATED } from "../utils/success.response";
import Tutor from "../models/tutor.model";
import { NotFoundError, UnauthorizedError } from "../utils/error.response";

class ReviewController {
    /**
     * POST /api/reviews
     * Create a new review for a completed teaching request
     */
    async createReview(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = req.user;
            if (!currentUser || !currentUser._id) {
                throw new Error("Chưa xác thực người dùng");
            }

            const { teachingRequestId, rating, comment } = req.body;

            const review = await reviewService.createReview(
                teachingRequestId,
                currentUser._id.toString(),
                rating,
                comment
            );

            new CREATED({
                message: "Tạo đánh giá thành công",
                metadata: { review },
            }).send(res);
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /api/reviews/tutor/:tutorId
     * Get all reviews for a tutor
     */
    async getTutorReviews(req: Request, res: Response, next: NextFunction) {
        try {
            const { tutorId } = req.params;

            const tutor = await Tutor.findById(tutorId).populate("userId", "_id");
            if (!tutor) {
                throw new NotFoundError("Không tìm thấy gia sư");
            }

            const reviews = await reviewService.getTutorReviews(tutor.userId._id.toString());

            new OK({
                message: "Lấy đánh giá của gia sư thành công",
                metadata: { reviews },
            }).send(res);
        } catch (err) {
            next(err);
        }
    }

    /**
     * Get reviews for the currently logged-in tutor
     * Supports pagination, filtering, and search
     */
    async getMyTutorReviews(req: Request, res: Response) {
        const currentUser = req.user;

        if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Chưa xác thực người dùng");
        }

        // Extract query parameters
        const {
            page,
            limit,
            keyword,
            subjects,
            levels,
            minRating,
            maxRating,
            sort,
            rating,
        } = req.query;

        // Handle both array and comma-separated formats for subjects and levels
        let subjectsArray: string[] = [];
        if (subjects) {
            if (Array.isArray(subjects)) {
                subjectsArray = subjects as string[];
            } else {
                subjectsArray = String(subjects).split(',');
            }
        }

        let levelsArray: string[] = [];
        if (levels) {
            if (Array.isArray(levels)) {
                levelsArray = levels as string[];
            } else {
                levelsArray = String(levels).split(',');
            }
        }

        const filters = {
            page: page ? Number(page) : 1,
            limit: limit ? Number(limit) : 10,
            keyword: keyword ? String(keyword) : "",
            subjects: subjectsArray,
            levels: levelsArray,
            minRating: minRating ? Number(minRating) : 0,
            maxRating: maxRating ? Number(maxRating) : 5,
            sort: (sort === "oldest" ? "oldest" : "newest") as "oldest" | "newest",
            rating: rating ? String(rating) : undefined,
        };

        const reviews = await reviewService.getTutorReviewsByUserId(
            String(currentUser._id),
            filters
        );

        new OK({
            message: "Lấy đánh giá của gia sư thành công",
            metadata: reviews,
        }).send(res);
    }
    /**
     * PUT /api/reviews/:reviewId
     * Update a review
     */
    async updateReview(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = req.user;
            if (!currentUser || !currentUser._id) {
                throw new Error("Chưa xác thực người dùng");
            }

            const { reviewId } = req.params;
            const { rating, comment } = req.body;

            const updatedReview = await reviewService.updateReview(
                reviewId,
                currentUser._id.toString(),
                { rating, comment }
            );

            new OK({
                message: "Cập nhật đánh giá thành công",
                metadata: { review: updatedReview },
            }).send(res);
        } catch (err) {
            next(err);
        }
    }


    /**
     * DELETE /api/reviews/:reviewId
     * Delete a review (soft delete)
     */
    // async deleteReview(req: Request, res: Response, next: NextFunction) {
    //     try {
    //         const currentUser = req.user;
    //         if (!currentUser || !currentUser._id) {
    //             throw new Error("Not authenticated");
    //         }

    //         const { reviewId } = req.params;

    //         await reviewService.deleteReview(reviewId, currentUser._id.toString());

    //         new OK({
    //             message: "Review deleted successfully",
    //         }).send(res);
    //     } catch (err) {
    //         next(err);
    //     }
    // }

    /**
     * GET /api/reviews/tutor/:tutorId/stats
     * Get tutor's rating statistics
     */
    async getTutorRatingStats(req: Request, res: Response, next: NextFunction) {
        try {
            const { tutorId } = req.params;
            const tutor = await Tutor.findById(tutorId).populate("userId", "_id");
            if (!tutor) {
                throw new NotFoundError("Không tìm thấy gia sư");
            }

            const stats = await reviewService.getTutorRatingStats(tutor.userId._id.toString());

            new OK({
                message: "Lấy thống kê đánh giá của gia sư thành công",
                metadata: { stats },
            }).send(res);
        } catch (err) {
            next(err);
        }
    }

    /**
     * GET /api/reviews/student/history
     * Get all reviews written by the current student with filtering
     */
    async getStudentReviewHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = req.user;
            if (!currentUser || !currentUser._id) {
                throw new Error("Chưa xác thực người dùng");
            }

            // Extract query parameters
            const {
                page,
                limit,
                keyword,
                subjects,
                levels,
                minRating,
                maxRating,
                sort,
                rating,
            } = req.query;

            // Handle both array and comma-separated formats
            let subjectsArray: string[] = [];
            if (subjects) {
                if (Array.isArray(subjects)) {
                    subjectsArray = subjects as string[];
                } else {
                    subjectsArray = String(subjects).split(',');
                }
            }

            let levelsArray: string[] = [];
            if (levels) {
                if (Array.isArray(levels)) {
                    levelsArray = levels as string[];
                } else {
                    levelsArray = String(levels).split(',');
                }
            }

            const filters = {
                page: page ? Number(page) : 1,
                limit: limit ? Number(limit) : 10,
                keyword: keyword ? String(keyword) : "",
                subjects: subjectsArray,
                levels: levelsArray,
                minRating: minRating ? Number(minRating) : 0,
                maxRating: maxRating ? Number(maxRating) : 5,
                sort: (sort === "oldest" ? "oldest" : "newest") as "oldest" | "newest",
                rating: rating ? String(rating) : undefined,
            };

            const result = await reviewService.getStudentReviewHistory(
                currentUser._id.toString(),
                filters
            );

            new OK({
                message: "Lấy lịch sử đánh giá của học sinh thành công",
                metadata: result,
            }).send(res);
        } catch (err) {
            next(err);
        }
    }

    /**
 * GET /api/review/check-eligibility/:tutorUserId
 * Check if current student can review a tutor (has completed learning commitments)
 */
    async checkReviewEligibility(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = req.user;
            if (!currentUser || !currentUser._id) {
                throw new Error("Chưa xác thực người dùng");
            }
            const { tutorUserId } = req.params;

            const eligibility = await reviewService.checkReviewEligibility(
                currentUser._id.toString(),
                tutorUserId
            );

            new OK({
                message: "Kiểm tra quyền đánh giá thành công",
                metadata: { eligibility },
            }).send(res);
        } catch (err) {
            next(err);
        }
    }
}

export default new ReviewController();