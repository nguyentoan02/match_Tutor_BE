import { NextFunction, Request, Response } from "express";
import { NotFoundError, UnauthorizedError } from "../utils/error.response";
import favoriteTutorService from "../services/favoriteTutor.service";
import { OK } from "../utils/success.response";
import { IUser } from "../types/types/user";
import { favoriteTutorBody } from "../schemas/favoriteTutor.schema";

class FavoriteTutor {
   async getMyFavoriteTutor(req: Request, res: Response, next: NextFunction) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const studentFavoriteUser = await favoriteTutorService.getStudentFavorite(
         currentUser._id.toString()
      );
      new OK({ message: "", metadata: studentFavoriteUser }).send(res);
   }

   async addFavoriteTutor(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const { favoriteTutorId } = req.body;
      const addedFavo = await favoriteTutorService.insertStudentFavorite(
         currentUser._id.toString(),
         favoriteTutorId
      );
      new OK({
         message: "added to your favorite Tutor",
         metadata: addedFavo,
      }).send(res);
   }

   async removeFavoriteTutor(req: Request, res: Response) {
      const currentUser = req.user;
      if (!currentUser || !currentUser._id) {
         throw new UnauthorizedError("Not authenticated");
      }
      const { favoriteTutorId } = req.body;
      const removedFav = await favoriteTutorService.deleteStudentFavorite(
         currentUser._id.toString(),
         favoriteTutorId
      );
      new OK({
         message: "removed favorite tutor",
         metadata: removedFav,
      }).send(res);
   }
}

export default new FavoriteTutor();
