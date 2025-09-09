import { Document, Types } from "mongoose";
import { SessionHistoryActionEnum } from "../enums/sessionHistory.enum";

export interface ISessionHistory extends Document {
   sessionId: Types.ObjectId;
   teachingRequestId?: Types.ObjectId;
   changedBy?: Types.ObjectId;
   action: SessionHistoryActionEnum | string;
   summary?: string;
   changes?: Record<string, any>;
   meta?: Record<string, any>;
   createdAt?: Date;
}
