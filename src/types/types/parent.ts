import { Document, Types } from "mongoose";
import { Relationship } from "../enums/relationship.enum";

export interface IChildRef {
   studentId: Types.ObjectId;
   relationship?: Relationship | string;
   canConfirmSession?: boolean;
   canMakePayment?: boolean;
   notes?: string;
}

export interface IParent extends Document {
   userId: Types.ObjectId;
   fullName: string;
   phone?: string;
   avatarUrl?: string;
   children?: IChildRef[];
   createdAt?: Date;
   updatedAt?: Date;
}
