import mongoose, { Schema } from "mongoose";
import { IReminderDoc } from "../types/types/reminder";
import { getVietnamTime } from "../utils/date.util";
import { REMINDER_METHOD_VALUES } from "../types/enums/reminder.enum";

const ReminderSchema: Schema<IReminderDoc> = new Schema(
   {
      sessionId: {
         type: Schema.Types.ObjectId,
         ref: "Session",
         required: true,
      },
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      remindAt: { type: Date, required: true },
      methods: [{ type: String, enum: REMINDER_METHOD_VALUES }],
   },
   {
      timestamps: {
         createdAt: true,
         updatedAt: false,
         currentTime: getVietnamTime,
      },
      collection: "reminders",
   }
);

ReminderSchema.index({ remindAt: 1 });

export default mongoose.model<IReminderDoc>("Reminder", ReminderSchema);
