import Student from "../models/student.model";
import Tutor from "../models/tutor.model";
import User from "../models/user.model";
import { NotFoundError } from "../utils/error.response";
import { getRecommendedTutorOrder } from "../utils/recommendationTutor";

export class RecommendationTutorService {
   /**
    * Lấy danh sách gia sư gợi ý cho học sinh dựa trên hồ sơ học sinh + danh sách tutor đã duyệt
    */
   async getRecommendedTutorsForStudent(userId: string) {
      // 1. Kiểm tra hồ sơ học sinh
      const student = await Student.findOne({ userId }).lean();
      if (!student) {
         throw new NotFoundError(
            "Bạn chưa có hồ sơ học sinh. Vui lòng tạo hồ sơ học sinh trước khi dùng chức năng gợi ý gia sư."
         );
      }

      // 2. Lấy danh sách tutor đã được duyệt
      const tutors = await Tutor.find({ isApproved: true })
         .select("-embedding")
         .populate({
            path: "userId",
            select: "email avatarUrl address gender name phone",
         })
         .lean();

      if (!tutors || tutors.length === 0) {
         throw new NotFoundError("Hiện chưa có gia sư nào được duyệt.");
      }

      // 3. Gọi OpenAI để tính độ phù hợp và thứ tự gợi ý
      const recommendations = await getRecommendedTutorOrder(student, tutors);

      // 4. Map & sort theo danh sách ID mà AI trả về
      const tutorMap = new Map<string, any>();
      tutors.forEach((t: any) => {
         tutorMap.set(String(t._id), t);
      });

      const orderedTutors: any[] = [];
      for (const item of recommendations) {
         const t = tutorMap.get(item.tutorId);
         if (t) {
            // Có thể gán thêm reason vào object tutor nếu muốn FE hiển thị lý do
            // (t as any).recommendationReason = item.reason;
            orderedTutors.push(t);
         }
      }

      // Nếu AI không chọn được ai thì fallback trả toàn bộ list tutor đã duyệt
      const finalTutors = orderedTutors.length > 0 ? orderedTutors : tutors;
      const note =
         orderedTutors.length > 0
            ? undefined
            : "Không có gia sư nào đáp ứng được yêu cầu. Trả về danh sách gia sư đã được duyệt để bạn tham khảo.";

      return {
         data: finalTutors,
         pagination: {
            total: finalTutors.length,
            page: 1,
            limit: finalTutors.length,
            totalPages: 1,
         },
         note,
      };
   }
}

export default new RecommendationTutorService();
