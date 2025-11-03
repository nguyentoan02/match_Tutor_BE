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
   tutor: {
      status: "PENDING" | "ACCEPTED" | "REJECTED";
      decidedAt?: Date;
   };
   student: {
      status: "PENDING" | "ACCEPTED" | "REJECTED";
      decidedAt?: Date;
   };
   finalizedAt?: Date;
   isAttended: boolean;
}

export interface IAttendanceWindow {
   tutorDeadline: Date; // endTime + 15m
   studentDeadline: Date; // endTime + 30m
}

export interface IAttendanceLogEntry {
   userRole: "TUTOR" | "STUDENT" | "SYSTEM";
   action: "CHECKED_IN" | "ABSENT_AUTO" | "ABSENT_MANUAL" | "DISPUTE_OPENED";
   note?: string;
   createdAt: Date;
}

export interface IAbsenceInfo {
   tutorAbsent?: boolean;
   studentAbsent?: boolean;
   decidedAt?: Date;
   reason?: string;
   evidenceUrls?: string[];
}

export interface IDisputeInfo {
   status: "OPEN" | "RESOLVED";
   openedBy: Types.ObjectId;
   reason: string;
   evidenceUrls: string[];
   openedAt: Date;
   resolvedAt?: Date;
   resolvedBy?: Types.ObjectId;
   decision?: SessionStatus.COMPLETED | SessionStatus.NOT_CONDUCTED;
   adminNotes?: string;
}

export interface ICancellationInfo {
   cancelledBy: Types.ObjectId;
   reason: string;
   cancelledAt: Date;
}

export interface ISession extends Document {
   teachingRequestId?: Types.ObjectId; // Optional nếu chuyển sang learningCommitment
   learningCommitmentId: Types.ObjectId; // Thêm mới
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
   attendanceWindow?: IAttendanceWindow;
   attendanceLogs?: IAttendanceLogEntry[];
   absence?: IAbsenceInfo;
   dispute?: IDisputeInfo;
   cancellation?: ICancellationInfo;
   isDeleted?: boolean;
   deletedAt?: Date;
   deletedBy?: Types.ObjectId;

   materials?: Types.ObjectId[];
   quizIds: Types.ObjectId[];
   reminders?: IReminder[];
   location?: string;
   notes?: string;
   mcqQuizIds: Types.ObjectId[];
   createdAt?: Date;
   updatedAt?: Date;
}
