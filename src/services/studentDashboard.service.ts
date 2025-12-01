import Session from "../models/session.model";
import LearningCommitment from "../models/learningCommitment.model";
import QuizSubmission from "../models/quizSubmission.model";
import FavoriteTutor from "../models/favoriteTutor.model";
import Review from "../models/review.model";
import TeachingRequest from "../models/teachingRequest.model";
import Student from "../models/student.model"; // Import Student model
import mongoose, { Types } from "mongoose";

class StudentDashboardService {
    async getStudentDashboard(studentUserId: string) {
        // First, get the student document ID from the user ID
        const student = await Student.findOne({
            userId: new Types.ObjectId(studentUserId)
        }).select("_id").lean();

        if (!student) {
            // Return empty data if student profile doesn't exist
            return {
                nextSession: null,
                quickStats: {
                    activeCommitments: 0,
                    favoriteTutors: 0,
                    totalPaidAmount: 0,
                    totalReviews: 0,
                },
                sessionStats: {
                    completedSessions: 0,
                    absentSessions: 0,
                    quizzesCompleted: 0,
                },
                timeline: [],
                topCourses: [],
            };
        }

        const studentId = student._id.toString();

        const [
            nextSession,
            learningCommitments,
            quizSubmissions,
            favoriteTutors,
            recentSessions,
            recentQuizSubmissions,
            recentReviews,
            recentTeachingRequests,
            totalReviews,
        ] = await Promise.all([
            this.getNextSession(studentId),
            this.getLearningCommitments(studentId),
            this.getQuizSubmissions(studentUserId),
            this.getFavoriteTutors(studentUserId),
            this.getRecentSessions(studentId),
            this.getRecentQuizSubmissions(studentUserId),
            this.getRecentReviews(studentUserId),
            this.getRecentTeachingRequests(studentId),
            this.getTotalReviews(studentUserId),
        ]);

        // Calculate quick stats from learning commitments
        const activeCommitments = learningCommitments.filter(
            (lc: any) => lc.status === "active"
        ).length;

        // Get completed and absent sessions from learning commitments
        const totalCompletedSessions = learningCommitments.reduce(
            (sum: number, lc: any) => sum + (lc.completedSessions || 0), 0
        );

        const totalAbsentSessions = learningCommitments.reduce(
            (sum: number, lc: any) => sum + (lc.absentSessions || 0), 0
        );

        // Calculate total student paid amount from all commitments
        const totalStudentPaidAmount = learningCommitments.reduce(
            (sum: number, lc: any) => sum + (lc.studentPaidAmount || 0), 0
        );

        const quizzesCompleted = quizSubmissions.length;
        const favoriteTutorsCount = favoriteTutors.length;
        const totalReviewsCount = totalReviews;

        // Build timeline
        const timeline = this.buildTimeline(
            recentSessions,
            recentQuizSubmissions,
            recentReviews,
            recentTeachingRequests
        );

        // Get continuing courses (active commitments)
        const topCourses = learningCommitments
            .filter((lc: any) => lc.status === "active")
            .slice(0, 3)
            .map((lc: any) => ({
                id: lc._id,
                tutorName: lc.tutor?.userId?.name || "Unknown Tutor",
                subject: lc.teachingRequest?.subject || "Unknown Subject",
                level: lc.teachingRequest?.level || "Unknown Level",
                progress: {
                    completed: lc.completedSessions,
                    total: lc.totalSessions,
                    percentage: Math.round((lc.completedSessions / lc.totalSessions) * 100),
                },
                studentPaidAmount: lc.studentPaidAmount,
                absentSessions: lc.absentSessions || 0,
            }));

        return {
            nextSession,
            quickStats: {
                activeCommitments,
                favoriteTutors: favoriteTutorsCount,
                totalPaidAmount: totalStudentPaidAmount,
                totalReviews: totalReviewsCount,
            },
            sessionStats: {
                completedSessions: totalCompletedSessions,
                absentSessions: totalAbsentSessions,
                quizzesCompleted,
            },
            timeline,
            topCourses,
        };
    }

    private async getTotalReviews(studentUserId: string): Promise<number> {
        return Review.countDocuments({ reviewerId: new Types.ObjectId(studentUserId) });
    }

    private async getNextSession(studentId: string) {
        const now = new Date();

        const session = await Session.findOne({
            learningCommitmentId: {
                $in: await this.getStudentLearningCommitmentIds(studentId)
            },
            startTime: { $gt: now },
            status: "SCHEDULED",
        })
            .populate({
                path: "learningCommitmentId",
                populate: [
                    {
                        path: "tutor",
                        populate: {
                            path: "userId",
                            select: "name",
                        },
                    },
                    {
                        path: "teachingRequest",
                        select: "subject",
                    },
                ],
            })
            .sort({ startTime: 1 })
            .limit(1)
            .lean();

        if (!session) {
            return null;
        }

        const learningCommitment = session.learningCommitmentId as any;

        return {
            id: session._id,
            startTime: session.startTime,
            endTime: session.endTime,
            tutorName: learningCommitment.tutor?.userId?.name || "Unknown Tutor",
            subject: learningCommitment.teachingRequest?.subject || "Unknown Subject",
            status: session.status,
            studentConfirmation: session.studentConfirmation,
        };
    }

    private async getLearningCommitments(studentId: string) {
        return LearningCommitment.find({ student: new Types.ObjectId(studentId) })
            .populate({
                path: "tutor",
                populate: {
                    path: "userId",
                    select: "name",
                },
            })
            .populate("teachingRequest", "subject level")
            .lean();
    }

    private async getQuizSubmissions(studentUserId: string) {
        return QuizSubmission.find({ studentId: new Types.ObjectId(studentUserId) }).lean();
    }

    private async getFavoriteTutors(studentUserId: string) {
        return FavoriteTutor.find({ studentId: new Types.ObjectId(studentUserId) }).lean();
    }

    private async getRecentSessions(studentId: string, limit: number = 10) {
        return Session.find({
            learningCommitmentId: {
                $in: await this.getStudentLearningCommitmentIds(studentId)
            },
        })
            .populate({
                path: "learningCommitmentId",
                populate: [
                    {
                        path: "tutor",
                        populate: {
                            path: "userId",
                            select: "name",
                        },
                    },
                    {
                        path: "teachingRequest",
                        select: "subject",
                    },
                ],
            })
            .sort({ startTime: -1 })
            .limit(limit)
            .lean();
    }

    private async getRecentQuizSubmissions(studentUserId: string, limit: number = 5) {
        return QuizSubmission.find({ studentId: new Types.ObjectId(studentUserId) })
            .populate("quizId", "title")
            .sort({ submittedAt: -1 })
            .limit(limit)
            .lean();
    }

    private async getRecentReviews(studentUserId: string, limit: number = 5) {
        return Review.find({ reviewerId: new Types.ObjectId(studentUserId) })
            .populate("revieweeId", "name")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }

    private async getRecentTeachingRequests(studentId: string, limit: number = 5) {
        return TeachingRequest.find({ studentId: new Types.ObjectId(studentId) })
            .populate("tutorId", "userId")
            .populate({
                path: "tutorId",
                populate: {
                    path: "userId",
                    select: "name",
                },
            })
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();
    }

    private async getStudentLearningCommitmentIds(studentId: string): Promise<Types.ObjectId[]> {
        const commitments = await LearningCommitment.find({
            student: new Types.ObjectId(studentId)
        }).select("_id").lean<{ _id: Types.ObjectId }[]>();

        return commitments.map(commitment => commitment._id);
    }

    private buildTimeline(
        sessions: any[],
        quizSubmissions: any[],
        reviews: any[],
        teachingRequests: any[]
    ) {
        interface TimelineMetadata {
            sessionId?: Types.ObjectId | string;
            tutorName?: string;
            quizId?: Types.ObjectId | string;
            score?: number;
            rating?: number;
            revieweeId?: Types.ObjectId | string | any;
            requestId?: Types.ObjectId | string;
            subject?: string;
        }

        interface TimelineItem {
            type: "SESSION" | "QUIZ" | "REVIEW" | "TEACHING_REQUEST";
            title: string;
            description: string;
            status: string;
            date: Date | string;
            metadata?: TimelineMetadata;
        }

        const timelineItems: TimelineItem[] = [];

        // Add session events
        sessions.forEach(session => {
            const learningCommitment = session.learningCommitmentId as any;
            timelineItems.push({
                type: "SESSION",
                title: `Buổi học với ${learningCommitment.tutor?.userId?.name || "Gia sư"}`,
                description: `Môn học: ${learningCommitment.teachingRequest?.subject || "Không rõ"}`,
                status: session.status.toLowerCase(),
                date: session.startTime,
                metadata: {
                    sessionId: session._id,
                    tutorName: learningCommitment.tutor?.userId?.name,
                },
            });
        });

        // Add quiz submission events
        quizSubmissions.forEach(submission => {
            timelineItems.push({
                type: "QUIZ",
                title: "Đã nộp bài kiểm tra",
                description: `Bài kiểm tra: ${submission.quizId?.title || "Không rõ"}`,
                status: "completed",
                date: submission.submittedAt,
                metadata: {
                    quizId: submission.quizId?._id,
                    score: submission.score,
                },
            });
        });

        // Add review events
        reviews.forEach(review => {
            timelineItems.push({
                type: "REVIEW",
                title: "Đã gửi đánh giá",
                description: `Đánh giá cho: ${review.revieweeId?.name || "Gia sư"}`,
                status: "completed",
                date: review.createdAt,
                metadata: {
                    rating: review.rating,
                    revieweeId: review.revieweeId,
                },
            });
        });

        // Add teaching request events
        teachingRequests.forEach(request => {
            timelineItems.push({
                type: "TEACHING_REQUEST",
                title: "Yêu cầu học tập",
                description: `Trạng thái: ${request.status}`,
                status: request.status.toLowerCase(),
                date: request.createdAt,
                metadata: {
                    requestId: request._id,
                    subject: request.subject,
                    tutorName: request.tutorId?.userId?.name,
                },
            });
        });

        // Sort by date (newest first) and return top 10
        return timelineItems
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);
    }
}

export default new StudentDashboardService();