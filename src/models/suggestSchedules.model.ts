import mongoose, { mongo, Schema } from "mongoose";
import { ISuggestionSchedules } from "../types/types/suggestionSchedules";

const SuggestionSchedulesSchema: Schema<ISuggestionSchedules> = new Schema({
   tutorId: {
      type: Schema.Types.ObjectId,
      ref: "Tutor",
   },
   teachingRequestId: {
      type: Schema.Types.ObjectId,
      ref: "TeachingRequest",
   },
   schedules: [
      {
         start: Date,
         end: Date,
         _id: false,
      },
   ],
   title: String,
});

SuggestionSchedulesSchema.index({ tutorId: 1 });

export default mongoose.model("suggestionSchedules", SuggestionSchedulesSchema);
