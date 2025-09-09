import { Document, Types } from "mongoose";

export interface IRecommendedTutor {
   tutorId: Types.ObjectId;
   score?: number;
   reason?: string;
}

export interface IAIRecommendation extends Document {
   studentId: Types.ObjectId;
   recommendedTutors?: IRecommendedTutor[];
   generatedAt?: Date;
}
