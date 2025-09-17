import { Types } from "mongoose";
import {
   IAllStudentFavoriteTutor,
   IFavoriteTutor,
} from "../types/types/favoriteTutor";

export const studentFavoriteObject = (
   arr: IFavoriteTutor[]
): IAllStudentFavoriteTutor | null => {
   if (!arr.length) return null;

   const studentId = new Types.ObjectId(arr[0].studentId);

   const tutors = arr.map((item) => new Types.ObjectId(item.tutorId));

   return {
      studentId,
      tutors,
   };
};
