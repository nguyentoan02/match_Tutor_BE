import mongoose, { Schema } from "mongoose";
import { INotificationPreference } from "../types/types/notificationPreference";
import { getVietnamTime } from "../utils/date.util";
import {
   FREQUENCY_VALUES,
   DELIVERY_METHOD_VALUES,
   FrequencyEnum,
} from "../types/enums/notificationPreference.enum";

const NotificationPreferenceSchema: Schema<INotificationPreference> =
   new Schema(
      {
         userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
         notifyOnNewTutorMatch: { type: Boolean, default: true },
         preferredSubjects: [{ type: String }],
         preferredLevels: [{ type: String }],
         preferredRateRange: {
            min: { type: Number },
            max: { type: Number },
            _id: false,
         },
         frequency: {
            type: String,
            enum: FREQUENCY_VALUES,
            default: FrequencyEnum.INSTANT,
         },
         deliveryMethods: [{ type: String, enum: DELIVERY_METHOD_VALUES }],
         reminderTimes: [{ type: Number }],
      },
      {
         timestamps: {
            currentTime: getVietnamTime,
         },
         collection: "notification_preferences",
      }
   );

NotificationPreferenceSchema.index({ userId: 1 }, { unique: true });

export default mongoose.model<INotificationPreference>(
   "NotificationPreference",
   NotificationPreferenceSchema
);
