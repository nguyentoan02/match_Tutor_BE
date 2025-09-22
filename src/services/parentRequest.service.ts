import mongoose from "mongoose";
import parentModel from "../models/parent.model";
import userModel from "../models/user.model";
import { Role } from "../types/enums";
import { IParent } from "../types/types/parent";
import {
   sendParentRequestAddChildEmail,
   sendParentRequestEmail,
} from "../utils/emailParentRequest.util";
import { BadRequestError, NotFoundError } from "../utils/error.response";
import crypto from "crypto";
import studentModel from "../models/student.model";

class ParentRequestService {
   async inviteParent(
      parentEmail: string,
      userId: string,
      parentName: string,
      userName: string,
      relationship: string
   ): Promise<void> {
      const account = await userModel.findOne({
         email: parentEmail,
      });

      if (!account) {
         const parentAccount = new userModel({
            email: parentEmail,
            name: parentName,
            role: Role.PARENT,
            password: crypto.randomBytes(16).toString("hex"),
         });

         const randomBytes = crypto.randomBytes(32).toString("hex");
         const tokenPayload = `${randomBytes}:${userId}:${relationship}`;

         parentAccount.emailVerificationToken = crypto
            .createHash("sha256")
            .update(randomBytes)
            .digest("hex");

         parentAccount.emailVerificationExpires = new Date(
            Date.now() + 10 * 60 * 1000
         ); // 10 minutes

         await parentAccount.save();

         const activeUrl = `${process.env.FRONTEND_URL}/active-parent-account?token=${tokenPayload}`;
         await sendParentRequestEmail(
            parentEmail,
            parentName,
            userName,
            relationship,
            activeUrl
         );
         return;
      }
      if (account && account.role !== Role.PARENT) {
         throw new BadRequestError(
            "this account's email dose not have role Parent"
         );
      }
      if (account) {
         const existParent = await parentModel.findOne({ userId: account._id });
         if (!existParent) {
            throw new NotFoundError("can not find this parent");
         }
         const isAlreadyChild =
            Array.isArray(existParent.children) &&
            existParent.children.some((child) =>
               child.studentId.equals(userId)
            );
         if (isAlreadyChild) {
            throw new BadRequestError("This parent is already linked to you");
         }
         const getParentName = await userModel.findById(account._id);
         if (!getParentName) {
            throw new NotFoundError("Parent user not found");
         }
         const tokenPayload = `${account._id}:${userId}:${relationship}`;
         const inviteUrl = `${process.env.FRONTEND_URL}/invite-parent?inviteToken=${tokenPayload}`;
         await sendParentRequestAddChildEmail(
            account.email,
            getParentName.name,
            userName,
            relationship,
            inviteUrl
         );
         return;
      }
   }

   async activeParentAccount(
      activeToken: string,
      password: string
   ): Promise<IParent> {
      const parts = activeToken.split(":");
      if (parts.length !== 3) {
         throw new BadRequestError("Invalid token format");
      }

      const [tokenPart, studentId, relationship] = parts;

      const hashedToken = crypto
         .createHash("sha256")
         .update(tokenPart)
         .digest("hex");

      const user = await userModel.findOne({
         emailVerificationToken: hashedToken,
         emailVerificationExpires: { $gt: Date.now() },
      });

      if (!user) {
         throw new BadRequestError("Token is invalid or has expired");
      }

      user.isVerifiedEmail = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      user.password = password;
      user.role = Role.PARENT;
      await user.save();

      const parentProfile = await parentModel.create({
         userId: user._id,
         children: [
            {
               studentId: new mongoose.Types.ObjectId(studentId),
               relationship: relationship,
            },
         ],
      });

      return parentProfile;
   }

   async acceptInvitation(acceptToken: string): Promise<IParent> {
      const parts = acceptToken.split(":");
      if (parts.length !== 3) {
         throw new BadRequestError("Invalid token format");
      }
      const [parentId, studentId, relationship] = parts;
      const parent = await parentModel.findOne({ userId: parentId });
      if (!parent) throw new NotFoundError("Parent not found");

      const student = await studentModel.findOne({ userId: studentId });
      if (!student) throw new NotFoundError("Student not found");

      if (!Array.isArray(parent.children)) {
         parent.children = [];
      }
      parent.children.push({
         studentId: new mongoose.Types.ObjectId(studentId),
         relationship: relationship,
      });
      await parent.save();

      return parent;
   }
}

export default new ParentRequestService();
