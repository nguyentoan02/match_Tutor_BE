import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";

import { Role, ROLE_VALUES } from "../types/enums/role.enum";
import { GENDER_VALUES } from "../types/enums/gender.enum"; // added
import { getVietnamTime } from "../utils/date.util";
import { IUser } from "../types/types/user";

const UserSchema: Schema<IUser> = new Schema(
   {
      role: {
         type: String,
         enum: ROLE_VALUES,
         default: Role.STUDENT,
      },
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true, select: false },
      phone: { type: String, required: false },
      avatarUrl: { type: String, required: false },
      gender: { type: String, enum: GENDER_VALUES },
      // Ban info
      isBanned: { type: Boolean, default: false },
      banReason: { type: String },
      bannedAt: { type: Date },
      isVerifiedEmail: { type: Boolean, default: false },
      isVerifiedPhoneNumber: { type: Boolean, default: false },
      emailVerificationToken: { type: String, select: false },
      emailVerificationExpires: { type: Date, select: false },
      passwordResetToken: { type: String, select: false },
      passwordResetExpires: { type: Date, select: false },

      address: {
         city: { type: String },
         street: { type: String },
         lat: { type: Number },
         lng: { type: Number },
         _id: false,
      },
   },
   {
      timestamps: {
         currentTime: getVietnamTime,
      },
   }
);

// Hash password before saving
UserSchema.pre<IUser>("save", async function (next) {
   if (!this.isModified("password")) {
      return next();
   }
   const salt = await bcrypt.genSalt(10);
   if (!this.password) {
      throw new Error("Password is undefined");
   }
   const hashedPassword = await bcrypt.hash(this.password, salt);
   this.password = hashedPassword;
   next();
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (password: string) {
   return await bcrypt.compare(password, this.password);
};

export default mongoose.model<IUser>("User", UserSchema);
