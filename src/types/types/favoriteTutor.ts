import { Types } from "mongoose";

export interface IFavoriteTutor {
   // Mongoose Document sẽ được áp dụng khi dùng trong model
   studentId: Types.ObjectId;
   tutorId: Types.ObjectId;
   createdAt?: Date;
   updatedAt?: Date;
}

export interface IAllStudentFavoriteTutor {
   studentId: Types.ObjectId;
   tutors?: Types.ObjectId[];
}

export interface ICheckFavoriteTutorStatus {
   tutorId: Types.ObjectId | null | string;
   isFav: boolean;
}
