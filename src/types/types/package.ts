import { Document } from "mongoose";

export interface IPackage extends Document {
   name: string;
   description?: string;
   price: number;
   durationWeeks?: number;
   sessionsIncluded?: number;
   isActive?: boolean;
   createdAt?: Date;
   updatedAt?: Date;
}
