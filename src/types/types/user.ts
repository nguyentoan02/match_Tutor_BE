import { Document } from "mongoose";
import { Role } from "../enums/role.enum";
import { IAddress } from "./common";
import { Gender } from "../enums/gender.enum";

export interface IUser extends Document {
   role: Role;
   name: string;
   email: string;
   password?: string;
   phone?: string;
   address?: IAddress;
   avatarUrl?: string;
   gender?: Gender;
   isBanned?: boolean;
   banReason?: string;
   bannedAt?: Date;
   isVerifiedEmail: boolean;
   isVerifiedPhoneNumber: boolean;

   // xác thực email
   emailVerificationToken?: string;
   emailVerificationExpires?: Date;

   // xác thực password
   passwordResetToken?: string;
   passwordResetExpires?: Date;

   comparePassword?: (password: string) => Promise<boolean>;

   createdAt?: Date;
   updatedAt?: Date;
}
