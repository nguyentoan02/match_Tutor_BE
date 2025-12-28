import { Document, Types } from "mongoose";

export interface IMaterial extends Document {
   title: string;
   description?: string;
   fileUrl?: string;
   subject?: string;
   level?: string;
   uploadedBy?: Types.ObjectId;
   uploadedAt?: Date;
}
