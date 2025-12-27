import { Document, Types } from "mongoose";

export interface ISuggestionSchedules extends Document {
   tutorId: Types.ObjectId;
   title: string;
   schedules: {
      dayOfWeek: number;
      start: Date;
      end: Date;
   }[];
}

export interface SuggesstionSchedules {
   schedules: {
      dayOfWeek: number;
      start: Date;
      end: Date;
   }[];
   title: string;
}
