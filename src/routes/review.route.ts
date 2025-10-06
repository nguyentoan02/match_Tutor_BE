import { Router } from "express";
import reviewController from "../controllers/review.controller";
import { validate } from "../middlewares/validation.middleware";
import {
    createReviewSchema,
    updateReviewSchema
} from "../schemas/review.schema";
import { authenticate } from "../middlewares/auth.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create a review
router.post(
    "/",
    validate(createReviewSchema),
    reviewController.createReview
);

// Get reviews for a tutor
router.get(
    "/tutor/:tutorId",
    reviewController.getTutorReviews
);

// Update a review
router.put(
    "/:reviewId",
    validate(updateReviewSchema),
    reviewController.updateReview
);

// Delete a review
// router.delete(
//     "/:reviewId",
//     reviewController.deleteReview
// );

// Get tutor rating statistics
router.get(
    "/tutor/:tutorId/stats",
    reviewController.getTutorRatingStats
);

// Get all reviews written by current student
router.get(
    "/student/history",
    reviewController.getStudentReviewHistory
);



export default router;