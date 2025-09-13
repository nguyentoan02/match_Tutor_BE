import { Document, Types } from "mongoose";
import {
    FrequencyEnum,
    DeliveryMethodEnum,
} from "../enums/notificationPreference.enum";

export interface INotificationPreference extends Document {
    userId: Types.ObjectId;
    notifyOnNewTutorMatch?: boolean;
    preferredSubjects?: string[];
    preferredLevels?: string[];
    preferredRateRange?: { min?: number; max?: number };
    frequency?: FrequencyEnum;
    deliveryMethods?: (DeliveryMethodEnum | string)[];
    reminderTimes?: number[];
    createdAt?: Date;
    updatedAt?: Date;
}
