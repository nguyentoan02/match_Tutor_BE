import { Document, Types } from "mongoose";

export interface IAIRecommendation extends Document {
   studentId: Types.ObjectId;
   recommendedTutors?: string[];
   generatedAt?: Date;
}
