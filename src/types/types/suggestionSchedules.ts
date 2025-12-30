import { Document, Types } from "mongoose";

export type SuggestionStatus = "PENDING" | "REJECTED" | "ACCEPTED";

export interface IStudentSuggestionResponse {
   status: SuggestionStatus;
   reason?: string;
   respondedAt?: Date;
}

export interface ISuggestionSchedules extends Document {
   tutorId: Types.ObjectId;
   teachingRequestId: Types.ObjectId;
   title: string;
   proposedTotalPrice: number; // Giá tổng đề xuất của gia sư
   schedules: {
      start: Date;
      end: Date;
   }[];
   status: SuggestionStatus;
   studentResponse?: IStudentSuggestionResponse;
   createdAt: Date;
   updatedAt: Date;
}

export interface SuggesstionSchedules {
   schedules: {
      start: Date;
      end: Date;
   }[];
   TRId: string;
   title: string;
   proposedTotalPrice: number; // Giá tổng đề xuất của gia sư
}
