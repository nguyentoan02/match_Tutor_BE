import { Request, Response, NextFunction } from "express";
import authService from "../services/auth.service";
import { UnauthorizedError, ForbiddenError } from "../utils/error.response";
import { IUser } from "../types/types/user";
import { Role } from "../types/enums/role.enum";

/**
 * Gán kiểu mở rộng cho Request để dễ dùng trong controller
 */
declare global {
   namespace Express {
      interface Request {
         user?: IUser;
         token?: string;
      }
   }
}

/**
 * Middleware: authenticate
 * - Lấy token từ header Authorization (Bearer ...)
 * - Gọi authService.getUserFromToken để verify và lấy user
 * - Gán req.user và req.token
 */
export const authenticate = async (
   req: Request,
   res: Response,
   next: NextFunction
) => {
   try {
      const authHeader = (req.headers.authorization || "").toString();
      const token = authHeader.startsWith("Bearer ")
         ? authHeader.slice(7)
         : authHeader;

      if (!token) {
         throw new UnauthorizedError("No token provided");
      }

      const result = await authService.getUserFromToken(token);
      req.user = result.user as IUser;
      req.token = token;

      next();
   } catch (err) {
      next(err);
   }
};

/**
 * Middleware factory: authorize(...allowedRoles)
 * - Kiểm tra req.user.role nằm trong danh sách allowedRoles
 * - Nếu không có quyền => trả ForbiddenError
 *
 * Ví dụ sử dụng:
 * router.get("/admin-only", authenticate, authorize(Role.ADMIN), handler);
 */
export const isRole = (...allowedRoles: Role[]) => {
   return (req: Request, res: Response, next: NextFunction) => {
      try {
         const user = req.user;
         if (!user) {
            throw new UnauthorizedError("Not authenticated");
         }

         if (!allowedRoles.includes(user.role)) {
            throw new ForbiddenError("Insufficient permissions");
         }

         next();
      } catch (err) {
         next(err);
      }
   };
};
