import { Document, Types } from "mongoose";
import { SessionStatus } from "../enums/session.enum";
import { ReminderMethodEnum } from "../enums/reminder.enum";

export interface IReminder {
   userId: Types.ObjectId;
   minutesBefore: number;
   methods?: ReminderMethodEnum[];
}

export interface ISession extends Document {
   teachingRequestId: Types.ObjectId;
   startTime: Date;
   endTime: Date;
   status?: SessionStatus | string;
   isTrial?: boolean;
   createdBy?: Types.ObjectId;
   materials?: Types.ObjectId[];
   quizIds?: Types.ObjectId[];
   reminders?: IReminder[];
   location?: string;
   notes?: string;
   createdAt?: Date;
   updatedAt?: Date;
}
