import User from "../../models/user.model";
import Package from "../../models/package.model";
import Payment from "../../models/payment.model";
import Tutor from "../../models/tutor.model";
import { PaymentStatusEnum } from "../../types/enums/payment.enum";
import { NotFoundError, BadRequestError } from "../../utils/error.response";
import { Types } from "mongoose";
// No time-based util needed; packages have no time limit

export class AdminUserService {
   // Get all users with pagination and search (for admin dashboard)
   async getAllUsers(query: { page: number; limit: number; search?: string; role?: string }) {
      const { page, limit, search, role } = query;
      const skip = (page - 1) * limit;

      // Build search filter
      const searchFilter: any = {};
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }
      if (role) {
         searchFilter.role = role;
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get active users (not banned) with pagination and search
   async getActiveUsers(query: { page: number; limit: number; search?: string; role?: string }) {
      const { page, limit, search, role } = query;
      const skip = (page - 1) * limit;

      // Build search filter for active users
      const searchFilter: any = { isBanned: { $ne: true } };
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }
      if (role) {
         searchFilter.role = role;
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get banned users with pagination and search
   async getBannedUsersList(query: { page: number; limit: number; search?: string; role?: string }) {
      const { page, limit, search, role } = query;
      const skip = (page - 1) * limit;

      // Build search filter for banned users
      const searchFilter: any = { isBanned: true };
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }
      if (role) {
         searchFilter.role = role;
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ bannedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get banned tutors with pagination and search
   async getBannedTutors(query: { page: number; limit: number; search?: string }) {
      const { page, limit, search } = query;
      const skip = (page - 1) * limit;

      // Build search filter for banned tutors
      const searchFilter: any = { role: "TUTOR", isBanned: true };
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ bannedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get active tutors with pagination and search
   async getActiveTutors(query: { page: number; limit: number; search?: string }) {
      const { page, limit, search } = query;
      const skip = (page - 1) * limit;

      // Build search filter for active tutors
      const searchFilter: any = { role: "TUTOR", isBanned: { $ne: true } };
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get banned students with pagination and search
   async getBannedStudents(query: { page: number; limit: number; search?: string }) {
      const { page, limit, search } = query;
      const skip = (page - 1) * limit;

      // Build search filter for banned students
      const searchFilter: any = { role: "STUDENT", isBanned: true };
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ bannedAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // Get active students with pagination and search
   async getActiveStudents(query: { page: number; limit: number; search?: string }) {
      const { page, limit, search } = query;
      const skip = (page - 1) * limit;

      // Build search filter for active students
      const searchFilter: any = { role: "STUDENT", isBanned: { $ne: true } };
      if (search) {
         searchFilter.$or = [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
         ];
      }

      const [users, total] = await Promise.all([
         User.find(searchFilter)
            .select("-password")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
         User.countDocuments(searchFilter),
      ]);

      return {
         users,
         pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
         },
      };
   }

   // ========== TUTOR PACKAGE MANAGEMENT ==========

   /**
    * Tạo gói package mới
    */
   async createTutorPackage(packageData: {
      name: string;
      description?: string[];
      price: number;
      features?: {
         boostVisibility: boolean;
         priorityRanking: boolean;
         maxStudents: number;
         maxQuiz: number;
         featuredProfile: boolean;
      };
      isActive?: boolean;
      popular?: boolean;
   }) {
      // Kiểm tra giới hạn số gói hoạt động (tối đa 4)
      const isActive = packageData.isActive !== undefined ? packageData.isActive : true; // default true
      if (isActive) {
         const activePackagesCount = await Package.countDocuments({ isActive: true });
         if (activePackagesCount >= 4) {
            throw new BadRequestError(
               "Maximum 4 active packages allowed. Please deactivate another package first."
            );
         }
      }

      // Kiểm tra giới hạn số gói phổ biến (tối đa 1)
      const isPopular = packageData.popular === true;
      if (isPopular) {
         const popularPackagesCount = await Package.countDocuments({ popular: true });
         if (popularPackagesCount >= 1) {
            throw new BadRequestError(
               "Maximum 1 popular package allowed. Please remove popular flag from another package first."
            );
         }
      }

      const tutorPackage = new Package(packageData);
      return await tutorPackage.save();
   }

   /**
    * Lấy danh sách package (có filter isActive, phân trang)
    */
   async getAllTutorPackages(page: number = 1, limit: number = 10, isActive?: boolean) {
      const filter: any = {};
      
      if (isActive !== undefined) {
         filter.isActive = isActive;
      }

      const skip = (page - 1) * limit;
      const packages = await Package.find(filter)
         .sort({ createdAt: -1 })
         .skip(skip)
         .limit(limit)
         .lean();

      const total = await Package.countDocuments(filter);

      return {
         data: packages,
         pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
         },
      };
   }

   /**
    * Lấy chi tiết package theo id
    */
   async getTutorPackageById(packageId: string) {
      
      const tutorPackage = await Package.findById(packageId);
      if (!tutorPackage) {
         throw new NotFoundError("Tutor package not found");
      }
      return tutorPackage;
   }

   /**
    * Cập nhật package theo id
    */
   async updateTutorPackage(
      packageId: string,
      updateData: any
   ) {
      // Kiểm tra package tồn tại trước
      const existingPackage = await Package.findById(packageId);
      if (!existingPackage) {
         throw new NotFoundError("Tutor package not found");
      }

      // Kiểm tra giới hạn số gói hoạt động (tối đa 4)
      if (updateData.isActive === true) {
         const activePackagesCount = await Package.countDocuments({ 
            isActive: true,
            _id: { $ne: packageId } // Loại trừ package hiện tại
         });
         if (activePackagesCount >= 4) {
            throw new BadRequestError(
               "Maximum 4 active packages allowed. Please deactivate another package first."
            );
         }
      }

      // Kiểm tra giới hạn số gói phổ biến (tối đa 1)
      if (updateData.popular === true) {
         const popularPackagesCount = await Package.countDocuments({ 
            popular: true,
            _id: { $ne: packageId } // Loại trừ package hiện tại
         });
         if (popularPackagesCount >= 1) {
            throw new BadRequestError(
               "Maximum 1 popular package allowed. Please remove popular flag from another package first."
            );
         }
      }

      const tutorPackage = await Package.findByIdAndUpdate(
         packageId,
         updateData,
         { new: true, runValidators: true }
      );

      return tutorPackage;
   }

   /**
    * Xóa package khỏi database
    * Note: Xử lý payment liên quan sau
    */
   async deleteTutorPackage(packageId: string) {
      const tutorPackage = await Package.findById(packageId).lean();
      if (!tutorPackage) {
         throw new NotFoundError("Tutor package not found");
      }

      // Xóa thật sự khỏi database
      await Package.findByIdAndDelete(packageId);
   }

   /**
    * Lấy thống kê package dựa trên Payment (PAID): tổng gói, gói active, lượt mua, lượt còn hiệu lực, doanh thu
    */
   async getTutorPackageStats() {

      const [totalPackages, activePackages] = await Promise.all([
         Package.countDocuments(),
         Package.countDocuments({ isActive: true }),
      ]);

      // Tổng lượt mua gói = số payment PAID có packageId
      const totalSubscriptions = await Payment.countDocuments({
         packageId: { $ne: null },
         status: PaymentStatusEnum.PAID,
      });

      // Không giới hạn thời gian => activeSubscriptions = totalSubscriptions
      const activeSubscriptions = totalSubscriptions;

      // Doanh thu từ các payments PAID
      const revenueAgg = await Payment.aggregate([
         { $match: { status: PaymentStatusEnum.PAID } },
         { $group: { _id: null, totalRevenue: { $sum: "$amount" } } },
      ]);
      const revenue = revenueAgg.length > 0 ? revenueAgg[0].totalRevenue : 0;

      return { totalPackages, activePackages, totalSubscriptions, activeSubscriptions, revenue };
   }

   /**
    * Lấy danh sách tutor đang dùng package (Payment PAID còn hiệu lực), phân trang
    */
   async getTutorsUsingPackage(packageId: string, page: number = 1, limit: number = 10) {

      const skip = (page - 1) * limit;
      const pkgObjectId = new Types.ObjectId(packageId);
      
      // Tìm các payments PAID của gói này (không giới hạn thời gian)
      const paymentsAgg = await Payment.aggregate([
         { $match: { packageId: pkgObjectId, status: PaymentStatusEnum.PAID } },
         { $sort: { createdAt: -1 } },
         { $skip: skip },
         { $limit: limit },
      ]);

      const userIds = paymentsAgg.map((p: any) => p.userId);
      const tutors = await Tutor.find({ userId: { $in: userIds } })
         .populate({ path: "userId", select: "name email avatarUrl" })
         .lean();

      // Đếm tổng số purchases PAID cho gói
      const total = await Payment.countDocuments({ packageId: pkgObjectId, status: PaymentStatusEnum.PAID });

      return {
         data: tutors,
         pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
         },
      };
   }
}

export default new AdminUserService();

