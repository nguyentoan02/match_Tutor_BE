import suggestSchedulesModel from "../models/suggestSchedules.model";
import {
   IStudentSuggestionResponse,
   ISuggestionSchedules,
   SuggesstionSchedules,
} from "../types/types/suggestionSchedules";
import TeachingRequest from "../models/teachingRequest.model";
import Student from "../models/student.model";
import Tutor from "../models/tutor.model";
import LearningCommitment from "../models/learningCommitment.model";
import Session from "../models/session.model";
import {
   BadRequestError,
   ForbiddenError,
   NotFoundError,
} from "../utils/error.response";
import { TeachingRequestStatus } from "../types/enums/teachingRequest.enum";
import { SessionStatus } from "../types/enums/session.enum";
import moment from "moment-timezone";
import { addNotificationJob } from "../queues/notification.queue";
import User from "../models/user.model";

class SuggestionSchedulesService {
   /**
    * Gia sư gửi (hoặc cập nhật) đề xuất lịch cho 1 teaching request
    * - Nếu lần đầu gửi, tự động set teachingRequest.status = ACCEPTED
    * - Mỗi teachingRequest chỉ giữ 1 bản ghi suggestion (luôn là bản mới nhất)
    * - Cho phép tạo suggestion schedules mới sau khi learning commitment đã completed hoặc cancelled
    */
   async saveSuggestions(
      schedules: SuggesstionSchedules,
      tutorUserId: string
   ): Promise<ISuggestionSchedules> {
      const teachingRequest = await TeachingRequest.findById(schedules.TRId);
      if (!teachingRequest) {
         throw new NotFoundError("Teaching request not found");
      }

      const tutor = await Tutor.findOne({ userId: tutorUserId });
      if (!tutor || String(teachingRequest.tutorId) !== String(tutor._id)) {
         throw new ForbiddenError(
            "You are not the tutor of this teaching request"
         );
      }

      // Kiểm tra xem có learning commitment đang active không
      // CHẶN nếu có commitment với status: pending_agreement, active, cancellation_pending, admin_review
      // CHO PHÉP tạo suggestion mới nếu:
      //   - Không có commitment nào
      //   - Commitment đã completed (học xong rồi, có thể tạo lịch mới)
      //   - Commitment đã cancelled hoặc rejected
      const activeCommitment = await LearningCommitment.findOne({
         teachingRequest: teachingRequest._id,
         status: {
            $in: [
               "pending_agreement",
               "active",
               "cancellation_pending",
               "admin_review",
            ],
         },
      });

      if (activeCommitment) {
         throw new BadRequestError(
            "Đã có một cam kết học tập đang hoạt động cho yêu cầu dạy học này. Vui lòng chờ cho đến khi nó được hoàn thành hoặc hủy bỏ."
         );
      }

      // Log để debug: kiểm tra xem có commitment completed không
      const completedCommitment = await LearningCommitment.findOne({
         teachingRequest: teachingRequest._id,
         status: "completed",
      });
      if (completedCommitment) {
         console.log(
            `✅ Allowing new suggestion after completed commitment ${completedCommitment._id} for teachingRequest ${schedules.TRId}`
         );
      }

      // Xóa các sessions cũ và commitment chưa thanh toán trước khi cập nhật lịch mới
      try {
         // 1. Tìm và xóa learning commitment chưa thanh toán (nếu có)
         const pendingCommitment = await LearningCommitment.findOne({
            teachingRequest: teachingRequest._id,
            status: "pending_agreement",
         });

         if (pendingCommitment) {
            // Xóa sessions liên quan
            await Session.deleteMany({
               learningCommitmentId: pendingCommitment._id,
            });
            // Xóa commitment
            await LearningCommitment.deleteOne({
               _id: pendingCommitment._id,
            });
         }

         // 2. Xóa các sessions cũ khác liên quan đến teaching request (nếu có)
         // Chỉ xóa các sessions chưa được confirm hoặc đã confirm nhưng chưa thanh toán
         await Session.deleteMany({
            teachingRequestId: teachingRequest._id,
            status: { $in: ["SCHEDULED", "CONFIRMED"] },
            learningCommitmentId: { $exists: false }, // Chỉ xóa sessions không có commitment
         });
      } catch (error) {
         console.error(
            "Error cleaning up old sessions/commitments on save suggestions:",
            error
         );
         // Không throw error để không làm gián đoạn quá trình lưu
      }

      // Nếu là lần đầu gia sư gửi đề xuất thì coi như đã ACCEPT yêu cầu dạy
      if (teachingRequest.status === TeachingRequestStatus.PENDING) {
         teachingRequest.status = TeachingRequestStatus.ACCEPTED;
         await teachingRequest.save();
      }

      // Tìm suggestion hiện tại (nếu có) - chỉ để log, KHÔNG xóa
      const existingSuggestion = await suggestSchedulesModel
         .findOne({
            teachingRequestId: schedules.TRId,
         })
         .sort({ createdAt: -1 }); // Lấy suggestion mới nhất

      // Validate không trùng với sessions SCHEDULED/CONFIRMED của tutor và student
      const student = await Student.findById(teachingRequest.studentId);
      if (!student) {
         throw new NotFoundError("Student not found");
      }

      // Lấy tất cả learning commitments của tutor và student đang active
      const tutorCommitments = await LearningCommitment.find({
         tutor: tutor._id,
         status: "active",
      })
         .select("_id")
         .lean();
      const tutorCommitmentIds = tutorCommitments.map((c) => c._id);

      const studentCommitments = await LearningCommitment.find({
         student: student._id,
         status: "active",
      })
         .select("_id")
         .lean();
      const studentCommitmentIds = studentCommitments.map((c) => c._id);

      // Check conflict với sessions SCHEDULED/CONFIRMED của tutor
      if (tutorCommitmentIds.length > 0) {
         for (const schedule of schedules.schedules) {
            const sStart = new Date(schedule.start);
            const sEnd = new Date(schedule.end);

            const tutorSessionConflict = await Session.findOne({
               learningCommitmentId: { $in: tutorCommitmentIds },
               status: {
                  $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED],
               },
               isDeleted: { $ne: true },
               $or: [{ startTime: { $lt: sEnd }, endTime: { $gt: sStart } }],
            }).lean();

            if (tutorSessionConflict) {
               throw new BadRequestError(
                  `Gia sư có buổi học đã được lên lịch vào thời gian ${moment(
                     sStart
                  )
                     .tz("Asia/Ho_Chi_Minh")
                     .format(
                        "HH:mm DD/MM/YYYY"
                     )}. Vui lòng chọn thời gian khác.`
               );
            }
         }
      }

      // Check conflict với sessions SCHEDULED/CONFIRMED của student
      if (studentCommitmentIds.length > 0) {
         for (const schedule of schedules.schedules) {
            const sStart = new Date(schedule.start);
            const sEnd = new Date(schedule.end);

            const studentSessionConflict = await Session.findOne({
               learningCommitmentId: { $in: studentCommitmentIds },
               status: {
                  $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED],
               },
               isDeleted: { $ne: true },
               $or: [{ startTime: { $lt: sEnd }, endTime: { $gt: sStart } }],
            }).lean();

            if (studentSessionConflict) {
               throw new BadRequestError(
                  `Học sinh có buổi học đã được lên lịch vào thời gian ${moment(
                     sStart
                  )
                     .tz("Asia/Ho_Chi_Minh")
                     .format(
                        "HH:mm DD/MM/YYYY"
                     )}. Vui lòng chọn thời gian khác.`
               );
            }
         }
      }

      // Check conflict với các suggestion đang pending của gia sư với học sinh khác
      // Lấy tất cả teaching requests của gia sư này với học sinh khác (không phải học sinh hiện tại)
      const otherTeachingRequests = await TeachingRequest.find({
         tutorId: tutor._id,
         studentId: { $ne: student._id }, // Chỉ lấy với học sinh khác
      }).select("_id");

      const otherTeachingRequestIds = otherTeachingRequests.map((tr) => tr._id);

      if (otherTeachingRequestIds.length > 0) {
         // Lấy suggestion mới nhất của mỗi teaching request có studentResponse.status = "PENDING"
         const latestSuggestionsPromises = otherTeachingRequestIds.map((trId) =>
            suggestSchedulesModel
               .findOne({
                  teachingRequestId: trId,
                  "studentResponse.status": "PENDING", // Chỉ lấy những suggestion đang pending
               })
               .select("schedules teachingRequestId")
               .sort({ createdAt: -1 }) // Lấy suggestion mới nhất
               .limit(1)
         );

         const latestSuggestionsResults = await Promise.all(
            latestSuggestionsPromises
         );
         const otherPendingSuggestions =
            latestSuggestionsResults.filter(Boolean); // Loại bỏ null/undefined

         // Kiểm tra conflict với từng schedule trong suggestion mới
         for (const schedule of schedules.schedules) {
            const sStart = new Date(schedule.start);
            const sEnd = new Date(schedule.end);

            // Kiểm tra conflict với các schedules trong các pending suggestions
            for (const pendingSuggestion of otherPendingSuggestions) {
               if (
                  pendingSuggestion &&
                  pendingSuggestion.schedules &&
                  pendingSuggestion.schedules.length > 0
               ) {
                  for (const pendingSchedule of pendingSuggestion.schedules) {
                     const pStart = new Date(pendingSchedule.start);
                     const pEnd = new Date(pendingSchedule.end);

                     // Kiểm tra overlap: nếu có overlap thì conflict
                     if (pStart < sEnd && pEnd > sStart) {
                        throw new BadRequestError(
                           `Gia sư đang có lịch đề xuất đang chờ phản hồi vào thời gian ${moment(
                              sStart
                           )
                              .tz("Asia/Ho_Chi_Minh")
                              .format(
                                 "HH:mm DD/MM/YYYY"
                              )}. Vui lòng chọn thời gian khác.`
                        );
                     }
                  }
               }
            }
         }
      }

      // Check conflict với các suggestion đang pending của học sinh với gia sư khác
      // Lấy tất cả teaching requests của học sinh này với gia sư khác (không phải gia sư hiện tại)
      const studentOtherTeachingRequests = await TeachingRequest.find({
         studentId: student._id,
         tutorId: { $ne: tutor._id }, // Chỉ lấy với gia sư khác
      }).select("_id");

      const studentOtherTeachingRequestIds = studentOtherTeachingRequests.map(
         (tr) => tr._id
      );

      if (studentOtherTeachingRequestIds.length > 0) {
         // Lấy suggestion mới nhất của mỗi teaching request có studentResponse.status = "PENDING"
         const studentLatestSuggestionsPromises =
            studentOtherTeachingRequestIds.map((trId) =>
               suggestSchedulesModel
                  .findOne({
                     teachingRequestId: trId,
                     "studentResponse.status": "PENDING", // Chỉ lấy những suggestion đang pending
                  })
                  .select("schedules teachingRequestId tutorId")
                  .populate({
                     path: "teachingRequestId",
                     select: "tutorId",
                     populate: {
                        path: "tutorId",
                        select: "userId",
                        populate: {
                           path: "userId",
                           select: "_id name avatarUrl email",
                        },
                     },
                  })
                  .sort({ createdAt: -1 }) // Lấy suggestion mới nhất
                  .limit(1)
            );

         const studentLatestSuggestionsResults = await Promise.all(
            studentLatestSuggestionsPromises
         );
         const studentOtherPendingSuggestions =
            studentLatestSuggestionsResults.filter(Boolean); // Loại bỏ null/undefined

         // Kiểm tra conflict với từng schedule trong suggestion mới
         for (const schedule of schedules.schedules) {
            const sStart = new Date(schedule.start);
            const sEnd = new Date(schedule.end);

            // Kiểm tra conflict với các schedules trong các pending suggestions của học sinh
            for (const pendingSuggestion of studentOtherPendingSuggestions) {
               if (
                  pendingSuggestion &&
                  pendingSuggestion.schedules &&
                  pendingSuggestion.schedules.length > 0
               ) {
                  for (const pendingSchedule of pendingSuggestion.schedules) {
                     const pStart = new Date(pendingSchedule.start);
                     const pEnd = new Date(pendingSchedule.end);

                     // Kiểm tra overlap: nếu có overlap thì conflict
                     if (pStart < sEnd && pEnd > sStart) {
                        const tutorName =
                           (pendingSuggestion.teachingRequestId as any)?.tutorId
                              ?.userId?.name || "gia sư khác";
                        throw new BadRequestError(
                           `Học sinh đang có lịch đề xuất đang chờ phản hồi với ${tutorName} vào thời gian ${moment(
                              sStart
                           )
                              .tz("Asia/Ho_Chi_Minh")
                              .format(
                                 "HH:mm DD/MM/YYYY"
                              )}. Vui lòng chọn thời gian khác.`
                        );
                     }
                  }
               }
            }
         }
      }

      // LUÔN TẠO SUGGESTION MỚI - KHÔNG GHI ĐÈ SUGGESTION CŨ
      // Logic này cho phép:
      //   - Tạo suggestion mới sau khi commitment completed (học xong rồi, có thể đặt lịch mới)
      //   - Tạo suggestion mới sau khi học sinh reject (gia sư chỉnh sửa và gửi lại)
      //   - Giữ lại lịch sử các suggestion cũ
      const s = await suggestSchedulesModel.create({
         tutorId: tutor._id,
         schedules: schedules.schedules,
         title: schedules.title,
         proposedTotalPrice: schedules.proposedTotalPrice,
         teachingRequestId: schedules.TRId,
         status: "PENDING",
         studentResponse: {
            status: "PENDING",
         },
      });

      // Gửi thông báo cho học sinh về lịch đề xuất mới
      try {
         const studentUser = await User.findById(student.userId)
            .select("_id name")
            .lean();
         const tutorUser = await User.findById(tutorUserId)
            .select("name")
            .lean();

         if (studentUser) {
            const tutorName = tutorUser?.name || "Gia sư";
            const title = "Lịch học mới được đề xuất";
            const message = `${tutorName} đã gửi đề xuất lịch học cho bạn. Vui lòng xem và phản hồi.`;
            await addNotificationJob(
               studentUser._id.toString(),
               title,
               message
            );
         }
      } catch (error) {
         console.error("Error sending notification for new suggestion:", error);
         // Không throw error để không làm gián đoạn quá trình tạo suggestion
      }

      return s;
   }

   /**
    * Lấy suggestion schedules theo teaching request ID
    * Chỉ cho phép học sinh hoặc gia sư của teaching request đó xem
    */
   async getByTeachingRequest(TRid: string, userId: string) {
      const teachingRequest = await TeachingRequest.findById(TRid);
      if (!teachingRequest) {
         throw new NotFoundError("Teaching request not found");
      }

      // Kiểm tra quyền: user phải là học sinh hoặc gia sư của teaching request
      const studentProfile = await Student.findOne({ userId });
      const tutorProfile = await Tutor.findOne({ userId });

      const isStudent =
         studentProfile &&
         String(teachingRequest.studentId) === String(studentProfile._id);
      const isTutor =
         tutorProfile &&
         String(teachingRequest.tutorId) === String(tutorProfile._id);

      if (!isStudent && !isTutor) {
         throw new ForbiddenError(
            "Bạn không có quyền xem lịch đề xuất này. Chỉ học sinh và gia sư liên quan mới có thể xem."
         );
      }

      // Lấy suggestion MỚI NHẤT (latest) dựa trên createdAt
      // Điều này đảm bảo học sinh và gia sư luôn thấy suggestion mới nhất
      // Các suggestion cũ vẫn được giữ lại trong database
      const result = await suggestSchedulesModel
         .findOne({
            teachingRequestId: TRid,
         })
         .sort({ createdAt: -1 }) // Sắp xếp theo thời gian tạo, mới nhất trước
         .populate({
            path: "teachingRequestId",
         });

      // Nếu là gia sư đang xem, thêm thông tin lịch bận của học sinh
      // Bao gồm: 1) các suggestion đang pending, 2) các session SCHEDULED và CONFIRMED
      let studentBusySchedules: any[] = [];
      let studentBusySessions: any[] = [];
      if (isTutor && tutorProfile) {
         // 1. Lấy các suggestion schedules đang pending của học sinh với gia sư khác
         // Lấy tất cả teaching requests của học sinh này với gia sư khác (không phải gia sư hiện tại)
         const otherTeachingRequests = await TeachingRequest.find({
            studentId: teachingRequest.studentId,
            tutorId: { $ne: tutorProfile._id }, // Chỉ lấy với gia sư khác
         }).select("_id");

         const otherTeachingRequestIds = otherTeachingRequests.map(
            (tr) => tr._id
         );

         // Lấy các suggestion schedules có studentResponse.status = "PENDING" (chưa được học sinh accept/reject)
         // CHỈ LẤY SUGGESTION MỚI NHẤT của mỗi teaching request (giống logic lấy suggestion chính)
         if (otherTeachingRequestIds.length > 0) {
            // Lấy suggestion mới nhất của mỗi teaching request có status PENDING
            // Sử dụng Promise.all để query song song cho hiệu quả
            const latestSuggestionsPromises = otherTeachingRequestIds.map(
               (trId) =>
                  suggestSchedulesModel
                     .findOne({
                        teachingRequestId: trId,
                        "studentResponse.status": "PENDING", // Chỉ lấy những suggestion đang pending
                     })
                     .select("schedules teachingRequestId tutorId")
                     .populate({
                        path: "teachingRequestId",
                        select: "tutorId studentId",
                        populate: [
                           {
                              path: "tutorId",
                              select: "userId",
                              populate: {
                                 path: "userId",
                                 select: "_id name avatarUrl email",
                              },
                           },
                        ],
                     })
                     .sort({ createdAt: -1 }) // Lấy suggestion mới nhất
                     .limit(1)
            );

            const latestSuggestionsResults = await Promise.all(
               latestSuggestionsPromises
            );
            const otherSuggestions = latestSuggestionsResults.filter(Boolean); // Loại bỏ null/undefined

            // Chuyển đổi format để dễ sử dụng
            studentBusySchedules = otherSuggestions.map((suggestion: any) => ({
               schedules: suggestion.schedules || [],
               tutor: suggestion.teachingRequestId?.tutorId?.userId || null,
               teachingRequestId: suggestion.teachingRequestId?._id || null,
               type: "suggestion", // Đánh dấu là từ suggestion
            }));
         }

         // 2. Lấy các session SCHEDULED và CONFIRMED của học sinh với gia sư khác
         // Lấy tất cả learning commitments của học sinh này với status "active"
         // (đã thanh toán và đang học)
         const activeCommitments = await LearningCommitment.find({
            student: teachingRequest.studentId,
            tutor: { $ne: tutorProfile._id }, // Chỉ lấy với gia sư khác
            status: "active",
         }).select("_id");

         const otherCommitmentIds = activeCommitments.map((lc) => lc._id);

         // Lấy các session với trạng thái SCHEDULED và CONFIRMED
         if (otherCommitmentIds.length > 0) {
            const otherSessions = await Session.find({
               learningCommitmentId: { $in: otherCommitmentIds },
               status: {
                  $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED],
               },
               isDeleted: { $ne: true },
            })
               .select("startTime endTime status learningCommitmentId")
               .populate({
                  path: "learningCommitmentId",
                  select: "tutor teachingRequest",
                  populate: [
                     {
                        path: "tutor",
                        select: "userId",
                        populate: {
                           path: "userId",
                           select: "_id name avatarUrl email",
                        },
                     },
                     {
                        path: "teachingRequest",
                        select: "_id",
                     },
                  ],
               });

            // Chuyển đổi format để dễ sử dụng
            studentBusySessions = otherSessions.map((session: any) => ({
               startTime: session.startTime,
               endTime: session.endTime,
               status: session.status,
               tutor: session.learningCommitmentId?.tutor?.userId || null,
               teachingRequestId:
                  session.learningCommitmentId?.teachingRequest?._id || null,
               type: "session", // Đánh dấu là từ session
            }));
         }
      }

      // Nếu là học sinh đang xem, thêm thông tin lịch bận của gia sư
      // Bao gồm: 1) các suggestion đang pending, 2) các session SCHEDULED và CONFIRMED
      let tutorBusySchedules: any[] = [];
      let tutorBusySessions: any[] = [];
      if (isStudent && studentProfile && teachingRequest.tutorId) {
         // 1. Lấy các suggestion schedules đang pending của gia sư với học sinh khác
         // Lấy tất cả teaching requests của gia sư này với học sinh khác (không phải học sinh hiện tại)
         const otherTeachingRequests = await TeachingRequest.find({
            tutorId: teachingRequest.tutorId,
            studentId: { $ne: studentProfile._id }, // Chỉ lấy với học sinh khác
         }).select("_id");

         const otherTeachingRequestIds = otherTeachingRequests.map(
            (tr) => tr._id
         );

         // Lấy các suggestion schedules có studentResponse.status = "PENDING" (chưa được học sinh accept/reject)
         // CHỈ LẤY SUGGESTION MỚI NHẤT của mỗi teaching request (giống logic lấy suggestion chính)
         if (otherTeachingRequestIds.length > 0) {
            // Lấy suggestion mới nhất của mỗi teaching request có status PENDING
            // Sử dụng Promise.all để query song song cho hiệu quả
            const latestSuggestionsPromises = otherTeachingRequestIds.map(
               (trId) =>
                  suggestSchedulesModel
                     .findOne({
                        teachingRequestId: trId,
                        "studentResponse.status": "PENDING", // Chỉ lấy những suggestion đang pending
                     })
                     .select("schedules teachingRequestId tutorId")
                     .populate({
                        path: "teachingRequestId",
                        select: "tutorId studentId",
                        populate: [
                           {
                              path: "studentId",
                              select: "userId",
                              populate: {
                                 path: "userId",
                                 select: "_id name avatarUrl email",
                              },
                           },
                        ],
                     })
                     .sort({ createdAt: -1 }) // Lấy suggestion mới nhất
                     .limit(1)
            );

            const latestSuggestionsResults = await Promise.all(
               latestSuggestionsPromises
            );
            const otherSuggestions = latestSuggestionsResults.filter(Boolean); // Loại bỏ null/undefined

            // Chuyển đổi format để dễ sử dụng
            tutorBusySchedules = otherSuggestions.map((suggestion: any) => ({
               schedules: suggestion.schedules || [],
               student: suggestion.teachingRequestId?.studentId?.userId || null,
               teachingRequestId: suggestion.teachingRequestId?._id || null,
               type: "suggestion", // Đánh dấu là từ suggestion
            }));
         }

         // 2. Lấy các session SCHEDULED và CONFIRMED của gia sư với học sinh khác
         // Lấy tất cả learning commitments của gia sư này với status "active"
         // (đã thanh toán và đang học)
         const activeCommitments = await LearningCommitment.find({
            tutor: teachingRequest.tutorId,
            student: { $ne: studentProfile._id }, // Chỉ lấy với học sinh khác
            status: "active",
         }).select("_id");

         const otherCommitmentIds = activeCommitments.map((lc) => lc._id);

         // Lấy các session với trạng thái SCHEDULED và CONFIRMED
         if (otherCommitmentIds.length > 0) {
            const otherSessions = await Session.find({
               learningCommitmentId: { $in: otherCommitmentIds },
               status: {
                  $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED],
               },
               isDeleted: { $ne: true },
            })
               .select("startTime endTime status learningCommitmentId")
               .populate({
                  path: "learningCommitmentId",
                  select: "tutor student teachingRequest",
                  populate: [
                     {
                        path: "student",
                        select: "userId",
                        populate: {
                           path: "userId",
                           select: "_id name avatarUrl email",
                        },
                     },
                     {
                        path: "teachingRequest",
                        select: "_id",
                     },
                  ],
               });

            // Chuyển đổi format để dễ sử dụng
            tutorBusySessions = otherSessions.map((session: any) => ({
               startTime: session.startTime,
               endTime: session.endTime,
               status: session.status,
               student: session.learningCommitmentId?.student?.userId || null,
               teachingRequestId:
                  session.learningCommitmentId?.teachingRequest?._id || null,
               type: "session", // Đánh dấu là từ session
            }));
         }
      }

      // Trả về kết quả kèm lịch bận của học sinh (nếu là gia sư)
      // hoặc lịch bận của gia sư (nếu là học sinh)
      // Nếu là gia sư, luôn trả về studentBusySchedules và studentBusySessions
      // ngay cả khi chưa có suggestion (result = null)
      if (isTutor) {
         const resultObj = result ? result.toObject() : {};
         (resultObj as any).studentBusySchedules = studentBusySchedules;
         (resultObj as any).studentBusySessions = studentBusySessions;
         return resultObj;
      }

      // Nếu là học sinh, trả về result kèm lịch bận của gia sư và lịch bận của học sinh (suggestion pending với gia sư khác)
      // Lấy các suggestion đang pending của học sinh với gia sư khác
      let studentOwnPendingSchedules: any[] = [];
      if (isStudent && studentProfile) {
         // Lấy tất cả teaching requests của học sinh này với gia sư khác (không phải gia sư hiện tại)
         const studentOtherTRs = await TeachingRequest.find({
            studentId: studentProfile._id,
            tutorId: { $ne: teachingRequest.tutorId }, // Chỉ lấy với gia sư khác
         }).select("_id");

         const studentOtherTRIds = studentOtherTRs.map((tr) => tr._id);

         if (studentOtherTRIds.length > 0) {
            const studentPendingPromises = studentOtherTRIds.map((trId) =>
               suggestSchedulesModel
                  .findOne({
                     teachingRequestId: trId,
                     "studentResponse.status": "PENDING", // Chỉ lấy những suggestion đang pending
                  })
                  .select("schedules teachingRequestId tutorId")
                  .populate({
                     path: "teachingRequestId",
                     select: "tutorId",
                     populate: {
                        path: "tutorId",
                        select: "userId",
                        populate: {
                           path: "userId",
                           select: "_id name avatarUrl email",
                        },
                     },
                  })
                  .sort({ createdAt: -1 })
                  .limit(1)
            );

            const studentPendingResults = await Promise.all(
               studentPendingPromises
            );
            const studentPendingSuggestions =
               studentPendingResults.filter(Boolean);

            studentOwnPendingSchedules = studentPendingSuggestions.map(
               (suggestion: any) => ({
                  schedules: suggestion.schedules || [],
                  tutor: suggestion.teachingRequestId?.tutorId?.userId || null,
                  teachingRequestId: suggestion.teachingRequestId?._id || null,
                  type: "suggestion", // Đánh dấu là từ suggestion
               })
            );
         }
      }

      const resultObj = result ? result.toObject() : {};
      (resultObj as any).tutorBusySchedules = tutorBusySchedules;
      (resultObj as any).tutorBusySessions = tutorBusySessions;
      (resultObj as any).studentOwnPendingSchedules =
         studentOwnPendingSchedules;
      return resultObj;
   }

   /**
    * Học sinh phản hồi đề xuất lịch
    * Nếu ACCEPT: tự động tạo LearningCommitment và trả về commitmentId
    */
   async studentRespond(
      suggestionId: string,
      studentUserId: string,
      payload: { decision: "ACCEPT" | "REJECT"; reason?: string }
   ): Promise<ISuggestionSchedules & { commitmentId?: string }> {
      const suggestion = await suggestSchedulesModel
         .findById(suggestionId)
         .populate("teachingRequestId");

      if (!suggestion) {
         throw new NotFoundError("Suggestion schedule not found");
      }

      const teachingRequest: any = suggestion.teachingRequestId;

      const studentProfile = await Student.findOne({ userId: studentUserId });
      if (!studentProfile) {
         throw new NotFoundError("Student profile not found");
      }

      if (
         !teachingRequest ||
         String(teachingRequest.studentId) !== String(studentProfile._id)
      ) {
         throw new ForbiddenError(
            "You are not the owner of this teaching request"
         );
      }

      if (payload.decision === "REJECT" && !payload.reason) {
         throw new BadRequestError("Lý do từ chối là bắt buộc");
      }

      const response: IStudentSuggestionResponse = {
         status: payload.decision === "ACCEPT" ? "ACCEPTED" : "REJECTED",
         reason: payload.reason,
         respondedAt: new Date(),
      };

      suggestion.studentResponse = response;
      suggestion.status = response.status;

      // Đảm bảo save suggestion trước khi tạo commitment
      await suggestion.save();

      // Nếu học sinh REJECT: xóa các sessions cũ và learning commitment chưa thanh toán
      if (payload.decision === "REJECT") {
         try {
            // 1. Tìm và xóa learning commitment chưa thanh toán (pending_agreement)
            const pendingCommitment = await LearningCommitment.findOne({
               teachingRequest: teachingRequest._id,
               status: "pending_agreement",
            });

            if (pendingCommitment) {
               // 2. Xóa các sessions liên quan đến commitment này
               await Session.deleteMany({
                  learningCommitmentId: pendingCommitment._id,
               });

               // 3. Xóa commitment
               await LearningCommitment.deleteOne({
                  _id: pendingCommitment._id,
               });
            }

            // 4. Xóa các sessions cũ khác liên quan đến teaching request (nếu có)
            // (Trường hợp sessions được tạo trước đó nhưng không có commitment)
            await Session.deleteMany({
               teachingRequestId: teachingRequest._id,
               status: { $in: ["SCHEDULED", "CONFIRMED"] },
            });
         } catch (error) {
            console.error(
               "Error cleaning up sessions and commitments on reject:",
               error
            );
            // Không throw error để không làm gián đoạn quá trình từ chối
         }
      }

      // Nếu học sinh ACCEPT: tự động tạo LearningCommitment
      let commitmentId: string | undefined;
      if (payload.decision === "ACCEPT") {
         // Kiểm tra xem đã có commitment chưa (tránh tạo trùng)
         const existingCommitment = await LearningCommitment.findOne({
            teachingRequest: teachingRequest._id,
            status: {
               $in: [
                  "pending_agreement",
                  "active",
                  "cancellation_pending",
                  "admin_review",
               ],
            },
         });

         if (existingCommitment) {
            throw new BadRequestError(
               "Đã có một cam kết học tập đang hoạt động cho yêu cầu dạy học này."
            );
         }

         // Tính toán từ schedules
         const schedules = suggestion.schedules || [];
         if (schedules.length === 0) {
            throw new BadRequestError(
               "Lịch học không hợp lệ (không có buổi học)"
            );
         }

         // Tính totalSessions
         const totalSessions = schedules.length;

         // Tính tổng số giờ học (tính bằng giờ)
         let totalHours = 0;
         schedules.forEach((schedule) => {
            const start = new Date(schedule.start);
            const end = new Date(schedule.end);
            const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            totalHours += hours;
         });

         // Sử dụng giá tổng đề xuất từ suggestion thay vì giá trong teaching request
         const proposedTotalPrice = suggestion.proposedTotalPrice || 0;
         if (proposedTotalPrice <= 0) {
            throw new BadRequestError(
               "Giá tổng đề xuất không hợp lệ. Vui lòng kiểm tra lại."
            );
         }
         const totalAmount = proposedTotalPrice;

         // Tính sessionsPerWeek: đếm số buổi trong tuần đầu tiên
         const firstWeekStart = new Date(schedules[0].start);
         const firstWeekEnd = new Date(firstWeekStart);
         firstWeekEnd.setDate(firstWeekEnd.getDate() + 7);

         const sessionsInFirstWeek = schedules.filter((schedule) => {
            const sessionDate = new Date(schedule.start);
            return sessionDate >= firstWeekStart && sessionDate < firstWeekEnd;
         }).length;

         const sessionsPerWeek = sessionsInFirstWeek || 1;

         // Tìm startDate (ngày sớm nhất trong schedules)
         const startDates = schedules.map((s) => new Date(s.start));
         const startDate = new Date(
            Math.min(...startDates.map((d) => d.getTime()))
         );

         // Tạo LearningCommitment
         const commitment = await LearningCommitment.create({
            tutor: teachingRequest.tutorId,
            student: teachingRequest.studentId,
            teachingRequest: teachingRequest._id,
            totalSessions,
            sessionsPerWeek,
            startDate,
            totalAmount,
            studentPaidAmount: 0,
            status: "pending_agreement",
            completedSessions: 0,
            absentSessions: 0,
            extendedWeeks: 0,
            isMoneyTransferred: false,
         });

         commitmentId = String(commitment._id);
      }

      await suggestion.save();

      // Gửi thông báo cho gia sư về phản hồi của học sinh
      try {
         const tutorProfile = await Tutor.findById(suggestion.tutorId)
            .populate({ path: "userId", select: "_id" })
            .lean();
         const studentUser = await User.findById(studentUserId)
            .select("name")
            .lean();

         if (tutorProfile?.userId) {
            const studentName = studentUser?.name || "Học sinh";
            const isAccepted = payload.decision === "ACCEPT";
            const title = isAccepted
               ? "Lịch học đã được chấp nhận"
               : "Lịch học bị từ chối";
            const message = isAccepted
               ? `${studentName} đã chấp nhận lịch học bạn đề xuất. Cam kết học tập đã được tạo.`
               : `${studentName} đã từ chối lịch học. Lý do: ${
                    payload.reason || "Không có lý do"
                 }`;

            await addNotificationJob(
               (tutorProfile.userId as any)._id.toString(),
               title,
               message
            );
         }
      } catch (error) {
         console.error(
            "Error sending notification for student response:",
            error
         );
         // Không throw error để không làm gián đoạn quá trình phản hồi
      }

      // Trả về suggestion kèm commitmentId nếu có
      const result = suggestion.toObject();
      if (commitmentId) {
         (result as any).commitmentId = commitmentId;
      }
      return result as ISuggestionSchedules & { commitmentId?: string };
   }

   /**
    * Gia sư chỉnh sửa lại đề xuất lịch theo góp ý của học sinh
    */
   async tutorUpdateSuggestion(
      suggestionId: string,
      tutorUserId: string,
      data: Pick<
         SuggesstionSchedules,
         "schedules" | "title" | "proposedTotalPrice"
      >
   ): Promise<ISuggestionSchedules> {
      const suggestion = await suggestSchedulesModel
         .findById(suggestionId)
         .populate("teachingRequestId");

      if (!suggestion) {
         throw new NotFoundError("Suggestion schedule not found");
      }

      const teachingRequest: any = suggestion.teachingRequestId;

      const tutor = await Tutor.findOne({ userId: tutorUserId });
      if (!tutor || String(teachingRequest.tutorId) !== String(tutor._id)) {
         throw new ForbiddenError(
            "You are not the tutor of this teaching request"
         );
      }

      // Validate không trùng với sessions SCHEDULED/CONFIRMED của tutor và student
      const student = await Student.findById(teachingRequest.studentId);
      if (!student) {
         throw new NotFoundError("Student not found");
      }

      // Lấy tất cả learning commitments của tutor và student đang active
      const tutorCommitments = await LearningCommitment.find({
         tutor: tutor._id,
         status: "active",
      })
         .select("_id")
         .lean();
      const tutorCommitmentIds = tutorCommitments.map((c) => c._id);

      const studentCommitments = await LearningCommitment.find({
         student: student._id,
         status: "active",
      })
         .select("_id")
         .lean();
      const studentCommitmentIds = studentCommitments.map((c) => c._id);

      // Check conflict với sessions SCHEDULED/CONFIRMED của tutor
      if (tutorCommitmentIds.length > 0) {
         for (const schedule of data.schedules) {
            const sStart = new Date(schedule.start);
            const sEnd = new Date(schedule.end);

            const tutorSessionConflict = await Session.findOne({
               learningCommitmentId: { $in: tutorCommitmentIds },
               status: {
                  $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED],
               },
               isDeleted: { $ne: true },
               $or: [{ startTime: { $lt: sEnd }, endTime: { $gt: sStart } }],
            }).lean();

            if (tutorSessionConflict) {
               throw new BadRequestError(
                  `Gia sư có buổi học đã được lên lịch vào thời gian ${moment(
                     sStart
                  )
                     .tz("Asia/Ho_Chi_Minh")
                     .format(
                        "HH:mm DD/MM/YYYY"
                     )}. Vui lòng chọn thời gian khác.`
               );
            }
         }
      }

      // Check conflict với sessions SCHEDULED/CONFIRMED của student
      if (studentCommitmentIds.length > 0) {
         for (const schedule of data.schedules) {
            const sStart = new Date(schedule.start);
            const sEnd = new Date(schedule.end);

            const studentSessionConflict = await Session.findOne({
               learningCommitmentId: { $in: studentCommitmentIds },
               status: {
                  $in: [SessionStatus.SCHEDULED, SessionStatus.CONFIRMED],
               },
               isDeleted: { $ne: true },
               $or: [{ startTime: { $lt: sEnd }, endTime: { $gt: sStart } }],
            }).lean();

            if (studentSessionConflict) {
               throw new BadRequestError(
                  `Học sinh có buổi học đã được lên lịch vào thời gian ${moment(
                     sStart
                  )
                     .tz("Asia/Ho_Chi_Minh")
                     .format(
                        "HH:mm DD/MM/YYYY"
                     )}. Vui lòng chọn thời gian khác.`
               );
            }
         }
      }

      // Check conflict với các suggestion đang pending của gia sư với học sinh khác
      const otherTeachingRequests = await TeachingRequest.find({
         tutorId: tutor._id,
         studentId: { $ne: student._id }, // Chỉ lấy với học sinh khác
      }).select("_id");

      const otherTeachingRequestIds = otherTeachingRequests.map((tr) => tr._id);

      if (otherTeachingRequestIds.length > 0) {
         const latestSuggestionsPromises = otherTeachingRequestIds.map((trId) =>
            suggestSchedulesModel
               .findOne({
                  teachingRequestId: trId,
                  "studentResponse.status": "PENDING", // Chỉ lấy những suggestion đang pending
                  _id: { $ne: suggestionId }, // Loại trừ suggestion hiện tại đang được update
               })
               .select("schedules teachingRequestId")
               .sort({ createdAt: -1 }) // Lấy suggestion mới nhất
               .limit(1)
         );

         const latestSuggestionsResults = await Promise.all(
            latestSuggestionsPromises
         );
         const otherPendingSuggestions =
            latestSuggestionsResults.filter(Boolean);

         for (const schedule of data.schedules) {
            const sStart = new Date(schedule.start);
            const sEnd = new Date(schedule.end);

            for (const pendingSuggestion of otherPendingSuggestions) {
               if (
                  pendingSuggestion &&
                  pendingSuggestion.schedules &&
                  pendingSuggestion.schedules.length > 0
               ) {
                  for (const pendingSchedule of pendingSuggestion.schedules) {
                     const pStart = new Date(pendingSchedule.start);
                     const pEnd = new Date(pendingSchedule.end);

                     if (pStart < sEnd && pEnd > sStart) {
                        throw new BadRequestError(
                           `Gia sư đang có lịch đề xuất đang chờ phản hồi vào thời gian ${moment(
                              sStart
                           )
                              .tz("Asia/Ho_Chi_Minh")
                              .format(
                                 "HH:mm DD/MM/YYYY"
                              )}. Vui lòng chọn thời gian khác.`
                        );
                     }
                  }
               }
            }
         }
      }

      // Check conflict với các suggestion đang pending của học sinh với gia sư khác
      const studentOtherTeachingRequests = await TeachingRequest.find({
         studentId: student._id,
         tutorId: { $ne: tutor._id }, // Chỉ lấy với gia sư khác
      }).select("_id");

      const studentOtherTeachingRequestIds = studentOtherTeachingRequests.map(
         (tr) => tr._id
      );

      if (studentOtherTeachingRequestIds.length > 0) {
         const studentLatestSuggestionsPromises =
            studentOtherTeachingRequestIds.map((trId) =>
               suggestSchedulesModel
                  .findOne({
                     teachingRequestId: trId,
                     "studentResponse.status": "PENDING", // Chỉ lấy những suggestion đang pending
                  })
                  .select("schedules teachingRequestId tutorId")
                  .populate({
                     path: "teachingRequestId",
                     select: "tutorId",
                     populate: {
                        path: "tutorId",
                        select: "userId",
                        populate: {
                           path: "userId",
                           select: "_id name avatarUrl email",
                        },
                     },
                  })
                  .sort({ createdAt: -1 }) // Lấy suggestion mới nhất
                  .limit(1)
            );

         const studentLatestSuggestionsResults = await Promise.all(
            studentLatestSuggestionsPromises
         );
         const studentOtherPendingSuggestions =
            studentLatestSuggestionsResults.filter(Boolean);

         for (const schedule of data.schedules) {
            const sStart = new Date(schedule.start);
            const sEnd = new Date(schedule.end);

            for (const pendingSuggestion of studentOtherPendingSuggestions) {
               if (
                  pendingSuggestion &&
                  pendingSuggestion.schedules &&
                  pendingSuggestion.schedules.length > 0
               ) {
                  for (const pendingSchedule of pendingSuggestion.schedules) {
                     const pStart = new Date(pendingSchedule.start);
                     const pEnd = new Date(pendingSchedule.end);

                     if (pStart < sEnd && pEnd > sStart) {
                        const tutorName =
                           (pendingSuggestion.teachingRequestId as any)?.tutorId
                              ?.userId?.name || "gia sư khác";
                        throw new BadRequestError(
                           `Học sinh đang có lịch đề xuất đang chờ phản hồi với ${tutorName} vào thời gian ${moment(
                              sStart
                           )
                              .tz("Asia/Ho_Chi_Minh")
                              .format(
                                 "HH:mm DD/MM/YYYY"
                              )}. Vui lòng chọn thời gian khác.`
                        );
                     }
                  }
               }
            }
         }
      }

      // Xóa các sessions và commitment cũ trước khi cập nhật lịch mới
      try {
         // 1. Tìm và xóa learning commitment chưa thanh toán
         const pendingCommitment = await LearningCommitment.findOne({
            teachingRequest: teachingRequest._id,
            status: "pending_agreement",
         });

         if (pendingCommitment) {
            // Xóa sessions liên quan
            await Session.deleteMany({
               learningCommitmentId: pendingCommitment._id,
            });
            // Xóa commitment
            await LearningCommitment.deleteOne({
               _id: pendingCommitment._id,
            });
         }

         // 2. Xóa các sessions cũ khác (nếu có)
         await Session.deleteMany({
            teachingRequestId: teachingRequest._id,
            status: { $in: ["SCHEDULED", "CONFIRMED"] },
         });
      } catch (error) {
         console.error(
            "Error cleaning up old sessions/commitments on tutor update:",
            error
         );
         // Không throw error để không làm gián đoạn quá trình cập nhật
      }

      suggestion.schedules = data.schedules;
      suggestion.title = data.title;
      suggestion.proposedTotalPrice = data.proposedTotalPrice;
      suggestion.status = "PENDING";
      suggestion.studentResponse = {
         status: "PENDING",
      } as IStudentSuggestionResponse;

      await suggestion.save();

      // Gửi thông báo cho học sinh về lịch đề xuất được cập nhật
      try {
         const studentUser = await User.findById(student.userId)
            .select("_id")
            .lean();
         const tutorUser = await User.findById(tutorUserId)
            .select("name")
            .lean();

         if (studentUser) {
            const tutorName = tutorUser?.name || "Gia sư";
            const title = "Lịch học đã được cập nhật";
            const message = `${tutorName} đã cập nhật lịch học đề xuất. Vui lòng xem và phản hồi lại.`;
            await addNotificationJob(
               studentUser._id.toString(),
               title,
               message
            );
         }
      } catch (error) {
         console.error(
            "Error sending notification for updated suggestion:",
            error
         );
         // Không throw error để không làm gián đoạn quá trình cập nhật
      }

      return suggestion;
   }

   /**
    * Lấy tất cả suggestion schedules đang pending của gia sư
    * Dùng để hiển thị trong lịch chính
    */
   async getTutorPendingSuggestions(tutorUserId: string) {
      const tutor = await Tutor.findOne({ userId: tutorUserId });
      if (!tutor) {
         throw new NotFoundError("Tutor not found");
      }

      // Lấy tất cả suggestions đang pending (studentResponse.status = "PENDING")
      const pendingSuggestions = await suggestSchedulesModel
         .find({
            tutorId: tutor._id,
            "studentResponse.status": "PENDING",
         })
         .populate({
            path: "teachingRequestId",
            select: "_id subject studentId",
            populate: [
               {
                  path: "studentId",
                  select: "userId",
                  populate: {
                     path: "userId",
                     select: "_id name avatarUrl email",
                  },
               },
            ],
         })
         .sort({ createdAt: -1 })
         .lean();

      // Format dữ liệu để trả về
      return pendingSuggestions.map((suggestion: any) => ({
         _id: suggestion._id,
         teachingRequestId: suggestion.teachingRequestId?._id || null,
         title: suggestion.title,
         subject: suggestion.teachingRequestId?.subject || null,
         proposedTotalPrice: suggestion.proposedTotalPrice,
         schedules: suggestion.schedules || [],
         status: suggestion.status,
         studentResponse: suggestion.studentResponse,
         student: suggestion.teachingRequestId?.studentId?.userId || null,
         createdAt: suggestion.createdAt,
      }));
   }
}

export default new SuggestionSchedulesService();
