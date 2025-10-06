import { Request, Response, NextFunction } from "express";
import reviewService from "../services/review.service";
import { OK, CREATED } from "../utils/success.response";

class ReviewController {
    /**
     * POST /api/reviews
     * Create a new review for a completed teaching request
     */
    async createReview(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = req.user;
            if (!currentUser || !currentUser._id) {
                throw new Error("Not authenticated");
            }

            const { teachingRequestId, rating, comment } = req.body;

            const review = await reviewService.createReview(
                teachingRequestId,
                currentUser._id.toString(),
                rating,
                comment
            );

            new CREATED({
                message: "Review created successfully",
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

            const reviews = await reviewService.getTutorReviews(tutorId);

            new OK({
                message: "Tutor reviews retrieved successfully",
                metadata: { reviews },
            }).send(res);
        } catch (err) {
            next(err);
        }
    }

    /**
     * PUT /api/reviews/:reviewId
     * Update a review
     */
    async updateReview(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = req.user;
            if (!currentUser || !currentUser._id) {
                throw new Error("Not authenticated");
            }

            const { reviewId } = req.params;
            const { rating, comment } = req.body;

            const updatedReview = await reviewService.updateReview(
                reviewId,
                currentUser._id.toString(),
                { rating, comment }
            );

            new OK({
                message: "Review updated successfully",
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

            const stats = await reviewService.getTutorRatingStats(tutorId);

            new OK({
                message: "Tutor rating stats retrieved successfully",
                metadata: { stats },
            }).send(res);
        } catch (err) {
            next(err);
        }
    }

    /**
 * GET /api/reviews/student/history
 * Get all reviews written by the current student
 */
    async getStudentReviewHistory(req: Request, res: Response, next: NextFunction) {
        try {
            const currentUser = req.user;
            if (!currentUser || !currentUser._id) {
                throw new Error("Not authenticated");
            }

            const reviews = await reviewService.getStudentReviewHistory(currentUser._id.toString());

            new OK({
                message: "Student review history retrieved successfully",
                metadata: { reviews },
            }).send(res);
        } catch (err) {
            next(err);
        }
    }


}

export default new ReviewController();