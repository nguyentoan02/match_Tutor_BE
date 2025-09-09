import { Request, Response, NextFunction } from "express";
import userService from "../services/user.service";
import { OK } from "../utils/success.response";
import User from "../models/user.model";
import {
   ForbiddenError,
   NotFoundError,
   UnauthorizedError,
} from "../utils/error.response";

class UserController {
   // GET /api/user/me
   async getMe(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const user = await userService.getById(currentUser._id.toString());
         if (!user) {
            throw new NotFoundError("User not found");
         }

         new OK({
            message: "User profile retrieved",
            metadata: { user },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }

   // PUT /api/user/me
   async updateMe(req: Request, res: Response, next: NextFunction) {
      try {
         const currentUser = req.user;
         if (!currentUser || !currentUser._id) {
            throw new UnauthorizedError("Not authenticated");
         }

         const updates = req.body || {};
         const file = req.file;

         const updated = await userService.updateProfile(
            currentUser._id.toString(),
            updates,
            file
         );

         new OK({
            message: "Profile updated successfully",
            metadata: { user: updated },
         }).send(res);
      } catch (err) {
         next(err);
      }
   }
}

export default new UserController();
