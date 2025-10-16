import { Document, Types } from "mongoose";
import { SessionStatus } from "../enums/session.enum";
import { ReminderMethodEnum } from "../enums/reminder.enum";

export interface IReminder {
   userId: Types.ObjectId;
   minutesBefore: number;
   methods?: ReminderMethodEnum[];
}

export interface IStudentConfirmation {
   status: "PENDING" | "ACCEPTED" | "REJECTED";
   confirmedAt?: Date;
}

export interface IAttendanceConfirmation {
   tutorConfirmed: boolean;
   studentConfirmed: boolean;
   tutorConfirmedAt?: Date;
   studentConfirmedAt?: Date;
   isAttended: boolean;
}

export interface ICancellationInfo {
   cancelledBy: Types.ObjectId;
   reason: string;
   cancelledAt: Date;
}

export interface ISession extends Document {
   teachingRequestId: Types.ObjectId;
   startTime: Date;
   endTime: Date;
   status?: SessionStatus | string;
   isTrial?: boolean;
   // người tạo session luôn có mà sao lại optional nhỉ
   // nhưng mà bỏ đi thì nó bị type warning
   createdBy: Types.ObjectId;

   // New fields
   studentConfirmation?: IStudentConfirmation;
   attendanceConfirmation?: IAttendanceConfirmation;
   cancellation?: ICancellationInfo;
   isDeleted?: boolean;
   deletedAt?: Date;
   deletedBy?: Types.ObjectId;

   materials?: Types.ObjectId[];
   quizIds: Types.ObjectId[];
   reminders?: IReminder[];
   location?: string;
   notes?: string;
   createdAt?: Date;
   updatedAt?: Date;
}
