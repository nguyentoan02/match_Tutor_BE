import { Types } from "mongoose";
import {
   IAllStudentFavoriteTutor,
   IFavoriteTutor,
} from "../types/types/favoriteTutor";

export const studentFavoriteObject = (
   arr: IFavoriteTutor[]
): IAllStudentFavoriteTutor | null => {
   if (!arr.length) return null;

   const studentId =
      typeof arr[0].studentId === "object" && "toString" in arr[0].studentId
         ? arr[0].studentId
         : new Types.ObjectId(arr[0].studentId);

   const tutors = arr.map((item) => item.tutorId);

   return {
      studentId,
      tutors,
   };
};
