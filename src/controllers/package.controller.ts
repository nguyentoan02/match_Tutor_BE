import { Request, Response } from "express";
import { SuccessResponse } from "../utils/success.response";
import packageService from "../services/package.service";

class PackageController {
   // Lấy tất cả packages (công khai - không cần auth)
   async getAllPackages(req: Request, res: Response) {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const popular = req.query.popular === "true" ? true : undefined;

      const result = await packageService.getAllPackages(page, limit, popular);

      new SuccessResponse({
         message: "Packages retrieved successfully",
         metadata: result,
      }).send(res);
   }

   // Lấy package theo ID (công khai - không cần auth)
   async getPackageById(req: Request, res: Response) {
      const { id } = req.params;
      const packageData = await packageService.getPackageById(id);

      new SuccessResponse({
         message: "Package retrieved successfully",
         metadata: { package: packageData },
      }).send(res);
   }
}

export default new PackageController();

