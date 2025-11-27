import Payment, { IPayment } from "../models/payment.model";

interface PaginationResult {
   data: IPayment[];
   total: number;
   page: number;
   limit: number;
   totalPages: number;
}

class PaymentTutorService {
   /**
    * Lấy danh sách payment thành công của tutor (chỉ loại package)
    * @param tutorId - ID của tutor
    * @param page - Trang hiện tại (mặc định 1)
    * @param limit - Số item trên 1 trang (mặc định 6)
    */
   async getSuccessfulPaymentsTutor(
      tutorId: string,
      page: number = 1,
      limit: number = 6
   ): Promise<PaginationResult> {
      try {
         const skip = (page - 1) * limit;

         const filter: any = {
            userId: tutorId,
            status: "SUCCESS",
            type: "package",
         };

         const total = await Payment.countDocuments(filter);

         const data = await Payment.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

         const totalPages = Math.ceil(total / limit);

         return {
            data,
            total,
            page,
            limit,
            totalPages,
         };
      } catch (error) {
         throw new Error(`Failed to fetch payment history: ${error}`);
      }
   }

   /**
    * Lấy danh sách payment thành công của student (chỉ loại learningCommitment)
    * @param studentId - ID của student
    * @param page - Trang hiện tại (mặc định 1)
    * @param limit - Số item trên 1 trang (mặc định 6)
    */
   async getSuccessfulPaymentsStudent(
      studentId: string,
      page: number = 1,
      limit: number = 6
   ): Promise<PaginationResult> {
      try {
         const skip = (page - 1) * limit;

         const filter: any = {
            userId: studentId,
            status: "SUCCESS",
            type: "learningCommitment",
         };

         const total = await Payment.countDocuments(filter);

         const data = await Payment.find(filter)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 })
            .lean();

         const totalPages = Math.ceil(total / limit);

         return {
            data,
            total,
            page,
            limit,
            totalPages,
         };
      } catch (error) {
         throw new Error(`Failed to fetch payment history: ${error}`);
      }
   }
}

export default new PaymentTutorService();
