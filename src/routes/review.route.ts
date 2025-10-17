import { Router } from "express";
import reviewController from "../controllers/review.controller";
import { validate } from "../middlewares/validation.middleware";
import {
    createReviewSchema,
    updateReviewSchema
} from "../schemas/review.schema";
import { authenticate, isRole } from "../middlewares/auth.middleware";
import { Role } from "../types/enums";
const router = Router();

// Create a review
router.post(
    "/",
    validate(createReviewSchema),
    authenticate,
    isRole(Role.STUDENT),
    reviewController.createReview
);

// Get reviews for the currently authenticated tutor
router.get(
    "/tutor/me",
    authenticate,
    isRole(Role.TUTOR),
    reviewController.getMyTutorReviews
);

// Get reviews for a tutor by tutorId
router.get(
    "/tutor/:tutorId",
    reviewController.getTutorReviews
);

// Update a review
router.put(
    "/:reviewId",
    validate(updateReviewSchema),
    authenticate,
    isRole(Role.STUDENT),
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
    authenticate,
    isRole(Role.STUDENT),
    reviewController.getStudentReviewHistory
);



export default router;