import Package from "../models/package.model";
import { NotFoundError } from "../utils/error.response";

class PackageService {
   /**
    * Lấy danh sách packages công khai (chỉ lấy isActive = true, có filter popular, phân trang)
    */
   async getAllPackages(page: number = 1, limit: number = 10, popular?: boolean) {
      const filter: any = {
         isActive: true, // Chỉ lấy packages đang active
      };

      if (popular !== undefined) {
         filter.popular = popular;
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
    * Lấy chi tiết package theo id (chỉ lấy package đang active)
    */
   async getPackageById(packageId: string) {
      const packageData = await Package.findOne({
         _id: packageId,
         isActive: true,
      });

      if (!packageData) {
         throw new NotFoundError("Package not found or not active");
      }

      return packageData;
   }
}

export default new PackageService();

