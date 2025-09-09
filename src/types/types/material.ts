import { Document, Types } from "mongoose";

export interface IMaterial extends Document {
   sessionId: Types.ObjectId;
   title: string;
   description?: string;
   fileUrl?: string;
   uploadedBy?: Types.ObjectId;
   uploadedAt?: Date;
}
