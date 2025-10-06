import User from "../models/user.model";

export class AdminStatisticsService {
   // Get user statistics
   async getUserStatistics() {
      const [
         totalUsers,
         activeUsers,
         bannedUsers,
         usersByRole
      ] = await Promise.all([
         User.countDocuments({}),
         User.countDocuments({ isBanned: { $ne: true } }),
         User.countDocuments({ isBanned: true }),
         User.aggregate([
            {
               $group: {
                  _id: "$role",
                  count: { $sum: 1 },
                  active: {
                     $sum: {
                        $cond: [{ $ne: ["$isBanned", true] }, 1, 0]
                     }
                  },
                  banned: {
                     $sum: {
                        $cond: [{ $eq: ["$isBanned", true] }, 1, 0]
                     }
                  }
               }
            }
         ])
      ]);

      return {
         totalUsers,
         activeUsers,
         bannedUsers,
         usersByRole
      };
   }
}

export default new AdminStatisticsService();

