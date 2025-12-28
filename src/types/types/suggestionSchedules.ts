import { Document, Types } from "mongoose";

export interface ISuggestionSchedules extends Document {
   tutorId: Types.ObjectId;
   teachingRequestId: Types.ObjectId;
   title: string;
   schedules: {
      start: Date;
      end: Date;
   }[];
}

export interface SuggesstionSchedules {
   schedules: {
      start: Date;
      end: Date;
   }[];
   TRId: string;
   title: string;
}
