import mongoose, { mongo, Schema } from "mongoose";
import { ISuggestionSchedules } from "../types/types/suggestionSchedules";

const SuggestionSchedulesSchema: Schema<ISuggestionSchedules> = new Schema({
   tutorId: {
      type: Schema.Types.ObjectId,
      ref: "Tutor",
   },
   schedules: [
      {
         dayOfWeek: Number,
         start: Date,
         end: Date,
      },
   ],
   title: String,
});

SuggestionSchedulesSchema.index({ tutorId: 1 });

export default mongoose.model("suggestionSchedules", SuggestionSchedulesSchema);
