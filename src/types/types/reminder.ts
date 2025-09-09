import { Document, Types } from "mongoose";
import { ReminderMethodEnum } from "../enums/reminder.enum";

export interface IReminderDoc extends Document {
   sessionId: Types.ObjectId;
   userId: Types.ObjectId;
   remindAt: Date;
   methods?: ReminderMethodEnum[]; // ['in_app','email','sms'] using enum directly
   createdAt?: Date;
}
