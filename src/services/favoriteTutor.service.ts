import favoriteTutorModel from "../models/favoriteTutor.model";
import tutorModel from "../models/tutor.model";
import {
   IAllStudentFavoriteTutor,
   IFavoriteTutor,
} from "../types/types/favoriteTutor";
import { studentFavoriteObject } from "../utils/arrayCombiner.util";
import { BadRequestError, NotFoundError } from "../utils/error.response";

export class FavoriteTutorService {
   async getStudentFavorite(userId: string): Promise<IAllStudentFavoriteTutor> {
      const favorite = await favoriteTutorModel
         .find({ studentId: userId })
         .populate({
            path: "tutorId",
            select: "userId experienceYears availability subjects classType",
            populate: {
               path: "userId",
               select: "name email gender avatarUrl",
            },
         });
      if (favorite.length === 0) {
         throw new NotFoundError(
            "you haven't add any tutor to your favorite list"
         );
      }
      const payload = studentFavoriteObject(favorite);
      return payload as IAllStudentFavoriteTutor;
   }

   async insertStudentFavorite(
      userId: string,
      tutorId: string
   ): Promise<IFavoriteTutor> {
      const tutor = await tutorModel.findById(tutorId);
      const isExisted = await favoriteTutorModel.findOne({
         studentId: userId,
         tutorId: tutorId,
      });

      if (!tutor) {
         throw new NotFoundError("can not find this tutor");
      }

      if (isExisted) {
         throw new BadRequestError(
            "you have added this tutor to your favorite"
         );
      }
      const insertedFavo = await favoriteTutorModel.create({
         studentId: userId,
         tutorId: tutorId,
      });
      return insertedFavo;
   }

   async deleteStudentFavorite(
      userId: string,
      tutorId: string
   ): Promise<IFavoriteTutor> {
      const favTutor = await favoriteTutorModel.findOne({ studentId: userId });
      if (!favTutor) {
         throw new NotFoundError(
            "can not find this tutor in your favorite list"
         );
      }
      const deleteTutor = await favoriteTutorModel.findOneAndDelete({
         studentId: userId,
         tutorId: tutorId,
      });
      return deleteTutor as IFavoriteTutor;
   }

   async checkFav(userId: string, tutorId: string): Promise<boolean> {
      const existFav = await favoriteTutorModel.exists({
         studentId: userId,
         tutorId: tutorId,
      });
      return existFav ? true : false;
   }
}

export default new FavoriteTutorService();
