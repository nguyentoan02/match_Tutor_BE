import { Document, Types } from "mongoose";
import { Relationship } from "../enums/relationship.enum";
import { ParentPermission } from "../enums/parentPermission.enum"; // Import từ enum

export interface IChildRef {
   studentId: Types.ObjectId;
   relationship?: Relationship | string;
}

export interface IParent extends Document {
   userId: Types.ObjectId;

   children?: IChildRef[];
   permissions?: ParentPermission[];
   createdAt?: Date;
   updatedAt?: Date;
}
