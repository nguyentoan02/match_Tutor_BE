import User from "../models/user.model";

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
}

export default new AdminUserService();

