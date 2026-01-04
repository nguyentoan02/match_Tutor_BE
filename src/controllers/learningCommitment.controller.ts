import { Request, Response, NextFunction } from "express";
import * as learningCommitmentService from "../services/learningCommitment.service";
import { OK, CREATED } from "../utils/success.response";
import { UnauthorizedError, BadRequestError } from "../utils/error.response";
import TeachingRequest from "../models/teachingRequest.model";
import Tutor from "../models/tutor.model"; // Thêm dòng này

class LearningCommitmentController {
   async createLearningCommitment(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const {
            teachingRequest,
            totalSessions,
            sessionsPerWeek,
            startDate,
            totalAmount,
         } = req.body; // removed endDate from destructuring

         const userId = req.user?.id;
         if (!userId) {
            throw new UnauthorizedError("User not authenticated");
         }

         // Get Tutor ID from current user
         const tutorData = await Tutor.findOne({ userId }); // Thay thế

         if (!tutorData) {
            throw new UnauthorizedError("User is not a tutor");
         }

         const tutorId = String(tutorData._id);

         // Verify teaching request belongs to this tutor
         const tr = await TeachingRequest.findById(teachingRequest);
         if (!tr) throw new UnauthorizedError("Teaching request not found");

         if (String(tr.tutorId) !== tutorId) {
            throw new UnauthorizedError(
               "Teaching request does not belong to this tutor"
            );
         }

         const commitment =
            await learningCommitmentService.createLearningCommitment({
               tutor: tutorId, // Use tutorId from current user
               teachingRequest,
               totalSessions,
               sessionsPerWeek,
               startDate,
               totalAmount,
            });

         new CREATED({
            message: "Learning commitment created successfully",
            metadata: { commitment },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async getLearningCommitment(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const { id } = req.params;
         const userId = req.user?.id;
         const commitment =
            await learningCommitmentService.getLearningCommitment(id, userId);
         new OK({
            message: "Learning commitment retrieved successfully",
            metadata: { commitment },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async initiatePayment(req: Request, res: Response, next: NextFunction) {
      try {
         const { id } = req.params; // LearningCommitment ID
         const userId = req.user?.id; // Student ID
         const paymentLink = await learningCommitmentService.initiatePayment(
            id,
            userId
         );
         new OK({
            message: "Payment initiated successfully",
            metadata: { paymentLink },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async requestCancellation(req: Request, res: Response, next: NextFunction) {
      try {
         const { id } = req.params;
         const { reason, linkUrl } = req.body;
         const userId = req.user?.id;
         const role = req.user?.role as unknown as "student" | "tutor"; // Type assertion

         if (!userId || !role) {
            throw new UnauthorizedError("User not authenticated");
         }
         if (!reason) {
            throw new BadRequestError("Reason for cancellation is required");
         }

         const commitment = await learningCommitmentService.requestCancellation(
            id,
            userId,
            role,
            reason,
            linkUrl
         );

         new OK({
            message: "Cancellation request submitted successfully",
            metadata: commitment,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async rejectCancellation(req: Request, res: Response, next: NextFunction) {
      try {
         const { id } = req.params;
         const { reason, linkUrl } = req.body;
         const userId = req.user?.id;
         const role = req.user?.role as unknown as "student" | "tutor"; // Type assertion

         if (!userId || !role) {
            throw new UnauthorizedError("User not authenticated");
         }
         if (!reason) {
            throw new BadRequestError("Reason for rejection is required");
         }

         const commitment = await learningCommitmentService.rejectCancellation(
            id,
            userId,
            role,
            { reason, linkUrl }
         );

         new OK({
            message: "Cancellation rejected and escalated to admin for review.",
            metadata: commitment,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // Thêm: GET /api/learning-commitments?page=1&limit=10
   async listLearningCommitments(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const { page = "1", limit = "10" } = req.query;
         const pageNum = parseInt(page as string, 10) || 1;
         const limitNum = parseInt(limit as string, 10) || 10;

         const userId = req.user?.id;

         if (!userId) {
            throw new UnauthorizedError("User not authenticated");
         }

         // Bước 2: Gọi service với userId (remove tutorId and role)
         const result = await learningCommitmentService.listLearningCommitments(
            {
               userId,
               page: pageNum,
               limit: limitNum,
            }
         );

         new OK({
            message: "Learning commitments retrieved successfully",
            metadata: result,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   /**
    * GET /api/learning-commitments/teaching-requests/:tutorId
    * Get teaching requests for a specific tutor
    */

   /**
    * GET /api/teaching-requests
    * Get teaching requests for the current tutor (based on userId)
    */
   async getTeachingRequestsByTutorId(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const userId = req.user?.id;

         if (!userId) {
            throw new UnauthorizedError("User not authenticated");
         }

         // Bước 1: Tìm tutor dựa trên userId
         const tutor = await Tutor.findOne({ userId });

         if (!tutor) {
            throw new UnauthorizedError("User is not a tutor");
         }

         const tutorId = tutor._id;

         // Bước 2: Lấy danh sách teaching requests với status ACCEPTED
         const teachingRequests = await TeachingRequest.find({
            tutorId,
            status: "ACCEPTED",
         })
            .select(
               "_id subject level budget hours description status createdAt studentId"
            )
            .populate({
               path: "studentId",
               select: "userId",
               populate: {
                  path: "userId",
                  select: "name email",
                  model: "User",
               },
            })
            .lean();

         new OK({
            message: "Teaching requests retrieved successfully",
            metadata: { teachingRequests, count: teachingRequests.length },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async getActiveLearningCommitmentsByTutor(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const userId = req.user?.id;

         if (!userId) {
            throw new UnauthorizedError("User not authenticated");
         }

         const commitments =
            await learningCommitmentService.getActiveLearningCommitmentsByTutor(
               userId
            );

         new OK({
            message: "Active learning commitments retrieved successfully",
            metadata: {
               commitments,
               count: commitments.length,
            },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async rejectLearningCommitment(
      req: Request,
      res: Response,
      next: NextFunction
   ) {
      try {
         const { id } = req.params;
         const userId = req.user?.id;

         if (!userId) {
            throw new UnauthorizedError("User not authenticated");
         }

         const commitment =
            await learningCommitmentService.rejectLearningCommitment(
               id,
               userId
            );

         new OK({
            message: "Learning commitment rejected successfully",
            metadata: commitment,
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   async initiateTopUp(req: Request, res: Response, next: NextFunction) {
      try {
         const { id } = req.params; // LearningCommitment ID
         const userId = req.user?.id; // Student ID
         const { additionalSessions, amount } = req.body;

         if (!userId) throw new BadRequestError("User not authenticated");
         if (!additionalSessions || Number(additionalSessions) <= 0)
            throw new BadRequestError(
               "additionalSessions is required and must be > 0"
            );
         if (!amount || Number(amount) <= 0)
            throw new BadRequestError("amount is required and must be > 0");

         const paymentLink = await learningCommitmentService.initiateTopUp(
            id,
            userId,
            Number(additionalSessions),
            Number(amount)
         );

         new OK({
            message: "Top-up initiated successfully",
            metadata: { paymentLink },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new LearningCommitmentController();
