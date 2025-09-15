import mongoose, { Schema } from "mongoose";
import { IFavoriteTutor } from "../types/types/favoriteTutor";
import { getVietnamTime } from "../utils/date.util";

const FavoriteTutorSchema: Schema<IFavoriteTutor> = new Schema(
   {
      studentId: {
         type: Schema.Types.ObjectId,
         ref: "Student",
         required: true,
      },
      tutorId: { type: Schema.Types.ObjectId, ref: "Tutor", required: true },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
      collection: "favorite_tutors",
   }
);

FavoriteTutorSchema.index({ studentId: 1, tutorId: 1 }, { unique: true });
FavoriteTutorSchema.index({ studentId: 1 }); // truy vấn list nhanh hơn

export default mongoose.model<IFavoriteTutor>(
   "FavoriteTutor",
   FavoriteTutorSchema
);
