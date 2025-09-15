export interface IFavoriteTutor {
   // Mongoose Document sẽ được áp dụng khi dùng trong model
   studentId: import("mongoose").Types.ObjectId;
   tutorId: import("mongoose").Types.ObjectId;
   createdAt?: Date;
   updatedAt?: Date;
}
