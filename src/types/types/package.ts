import { Document } from "mongoose";

export interface IPackage extends Document {
   name: string;
   description?: string[];
   price: number;
   isActive?: boolean;
   popular?: boolean;
   // Optional tutor-specific features snapshot
   features?: {
      boostVisibility: boolean;
      priorityRanking: boolean;
      maxStudents?: number;
      maxQuiz?: number;
      featuredProfile: boolean;
   };
   createdAt?: Date;
   updatedAt?: Date;
}
