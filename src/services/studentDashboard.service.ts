import Session from "../models/session.model";
import LearningCommitment from "../models/learningCommitment.model";
import QuizSubmission from "../models/quizSubmission.model";
import FavoriteTutor from "../models/favoriteTutor.model";
import Review from "../models/review.model";
import TeachingRequest from "../models/teachingRequest.model";
import Student from "../models/student.model";
import mongoose, { Types } from "mongoose";

const SUBJECT_TRANSLATIONS: Record<string, string> = {
    ACCOUNTING: "Kế toán",
    ADDITIONAL_MATHS: "Toán nâng cao",
    BIOLOGY: "Sinh học",
    BUSINESS_STUDIES: "Kinh doanh",
    CHEMISTRY: "Hóa học",
    CHINESE: "Tiếng Trung",
    COMPUTER_SCIENCE: "Khoa học máy tính",
    ECONOMICS: "Kinh tế học",
    ENGLISH: "Tiếng Anh",
    FREE_CONSULTATION: "Tư vấn miễn phí",
    FURTHER_MATHS: "Toán nâng cao",
    GEOGRAPHY: "Địa lý",
    GUITAR: "Guitar",
    HISTORY: "Lịch sử",
    MALAY: "Tiếng Malay",
    MATHEMATICS: "Toán học",
    ORGAN: "Organ",
    PHONICS_ENGLISH: "Phát âm tiếng Anh",
    PHYSICS: "Vật lý",
    PIANO: "Piano",
    RISE_PROGRAM: "Chương trình RISE",
    SCIENCE: "Khoa học",
    SWIMMING: "Bơi lội",
    TAMIL: "Tiếng Tamil",
    TENNIS: "Tennis",
    WORLD_LITERATURE: "Văn học thế giới",
    YOGA: "Yoga",
};

function translateSubject(subject: string) {
    return SUBJECT_TRANSLATIONS[subject] || subject || "Không rõ";
}

const TEACHING_REQUEST_STATUS_TRANSLATIONS: Record<string, string> = {
    PENDING: "Chờ gia sư phản hồi",
    ACCEPTED: "Gia sư đã chấp nhận",
    REJECTED: "Gia sư từ chối",
    COMPLETED: "Hoàn thành",
};

function translateTeachingRequestStatus(status: string) {
    return TEACHING_REQUEST_STATUS_TRANSLATIONS[status] || status || "Không rõ";
}

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
            favoriteTutors,
            recentSessions,
            recentQuizSubmissions,
            recentReviews,
            recentTeachingRequests,
            totalReviews,
            currentMonthStats, // Get current month stats only
        ] = await Promise.all([
            this.getNextSession(studentId),
            this.getLearningCommitments(studentId),
            this.getFavoriteTutors(studentUserId),
            this.getRecentSessions(studentId),
            this.getRecentQuizSubmissions(studentUserId),
            this.getRecentReviews(studentUserId),
            this.getRecentTeachingRequests(studentId),
            this.getTotalReviews(studentUserId),
            this.getCurrentMonthStats(studentUserId, studentId), // Get stats for current month
        ]);

        // Calculate quick stats from learning commitments
        const activeCommitments = learningCommitments.filter(
            (lc: any) => lc.status === "active"
        ).length;

        // Calculate total student paid amount from all commitments
        const totalStudentPaidAmount = learningCommitments.reduce(
            (sum: number, lc: any) => sum + (lc.studentPaidAmount || 0), 0
        );

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
                tutorName: lc.tutor?.userId?.name || "Gia sư không xác định",
                subject: translateSubject(lc.teachingRequest?.subject) || "Môn học không xác định",
                level: lc.teachingRequest?.level || "Trình độ không xác định",
                progress: {
                    completed: lc.completedSessions,
                    total: lc.totalSessions,
                    percentage: lc.totalSessions ?
                        Math.round((lc.completedSessions / lc.totalSessions) * 100) : 0,
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
                completedSessions: currentMonthStats.completedSessions,
                absentSessions: currentMonthStats.absentSessions,
                quizzesCompleted: currentMonthStats.quizzesCompleted,
            },
            timeline,
            topCourses,
        };
    }

    private async getCurrentMonthStats(studentUserId: string, studentId: string) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1; // 1-12

        // Start of current month
        const startOfMonth = new Date(currentYear, currentMonth - 1, 1);
        // End of current month
        const endOfMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

        const commitmentIds = await this.getStudentLearningCommitmentIds(studentId);

        // Get current month stats in parallel
        const [sessionStats, quizStats] = await Promise.all([
            // Get session stats for current month
            commitmentIds.length > 0 ? Session.aggregate([
                {
                    $match: {
                        learningCommitmentId: { $in: commitmentIds },
                        status: { $in: ["COMPLETED", "ABSENT"] },
                        startTime: {
                            $gte: startOfMonth,
                            $lte: endOfMonth
                        }
                    },
                },
                {
                    $group: {
                        _id: "$status",
                        count: { $sum: 1 },
                    },
                },
            ]) : [],

            // Get quiz stats for current month
            QuizSubmission.aggregate([
                {
                    $match: {
                        studentId: new Types.ObjectId(studentUserId),
                        submittedAt: {
                            $gte: startOfMonth,
                            $lte: endOfMonth
                        }
                    },
                },
                {
                    $count: "count"
                },
            ]),
        ]);

        // Process session stats
        let completedSessions = 0;
        let absentSessions = 0;

        sessionStats.forEach((stat: any) => {
            if (stat._id === "COMPLETED") {
                completedSessions = stat.count;
            } else if (stat._id === "ABSENT") {
                absentSessions = stat.count;
            }
        });

        // Process quiz stats
        const quizzesCompleted = quizStats.length > 0 ? quizStats[0].count : 0;

        return {
            completedSessions,
            absentSessions,
            quizzesCompleted,
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
            tutorName: learningCommitment.tutor?.userId?.name || "Gia sư không xác định",
            subject: translateSubject(learningCommitment.teachingRequest?.subject) || "Môn học không xác định",
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
                description: `Môn học: ${translateSubject(learningCommitment.teachingRequest?.subject)}`,
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
                description: `Trạng thái: ${translateTeachingRequestStatus(request.status)}`,
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