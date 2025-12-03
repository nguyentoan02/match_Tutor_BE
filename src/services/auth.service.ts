import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/user.model";
import Wallet from "../models/wallet.model"; // Add this import

import {
   BadRequestError,
   ConflictError,
   UnauthorizedError,
   InternalServerError,
} from "../utils/error.response";
import {
   sendVerificationEmail,
   sendPasswordResetEmail,
} from "../utils/emailTemplateAuth";
import { CreateUserBody } from "../schemas/user.schema";
import { IUser } from "../types/types/user";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class AuthService {
   private createToken(user: IUser): string {
      // ensure payload uses string id
      const payload = {
         id: user._id?.toString(),
         role: user.role,
         email: user.email,
      };

      const secret = process.env.JWT_SECRET;
      if (!secret)
         throw new InternalServerError("JWT_SECRET is not configured");

      const expiresEnv = process.env.JWT_EXPIRES_IN ?? "1d";
      const expiresIn = /^\d+$/.test(expiresEnv)
         ? Number(expiresEnv)
         : expiresEnv;

      return jwt.sign(
         payload,
         secret as jwt.Secret,
         { expiresIn } as jwt.SignOptions
      );
   }

   // Register a new user
   async register(userData: CreateUserBody): Promise<IUser> {
      const existingUser = await User.findOne({ email: userData.email });
      if (existingUser) {
         throw new ConflictError("Tài khoản với email này đã được đăng ký");
      }

      const user = new User(userData);

      // Create verification token
      const verificationToken = crypto.randomBytes(32).toString("hex");
      user.emailVerificationToken = crypto
         .createHash("sha256")
         .update(verificationToken)
         .digest("hex");
      // set verification expiry to 15 minutes
      user.emailVerificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await user.save();

      // Create a wallet for the new user
      const wallet = new Wallet({ userId: user._id });
      await wallet.save();

      // Send verification email — use fallback name (local part of email) if name is missing
      const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
      await sendVerificationEmail(
         user.email,
         (user.name as string) ?? user.email.split("@")[0],
         verificationUrl
      );

      return user;
   }

   // Verify user's email
   async verifyEmail(token: string): Promise<void> {
      const hashedToken = crypto
         .createHash("sha256")
         .update(token)
         .digest("hex");

      const user = await User.findOne({
         emailVerificationToken: hashedToken,
         emailVerificationExpires: { $gt: Date.now() },
      });

      if (!user) {
         throw new BadRequestError("Token không có hiệu lực hoặc hết hạn");
      }

      user.isVerifiedEmail = true;
      user.emailVerificationToken = undefined;
      user.emailVerificationExpires = undefined;
      await user.save();
   }

   // Forgot password
   async forgotPassword(email: string): Promise<void> {
      const user = await User.findOne({ email });
      if (!user) {
         return;
      }

      const resetToken = crypto.randomBytes(32).toString("hex");
      user.passwordResetToken = crypto
         .createHash("sha256")
         .update(resetToken)
         .digest("hex");
      // set reset token expiry to 15 minutes
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
      await sendPasswordResetEmail(user.email, user.name, resetUrl);
   }

   // Reset password
   async resetPassword(token: string, newPassword: string): Promise<void> {
      const hashedToken = crypto
         .createHash("sha256")
         .update(token)
         .digest("hex");

      // Find user by token regardless of expiry so we can clear expired tokens
      const user = await User.findOne({ passwordResetToken: hashedToken });

      if (!user) {
         throw new BadRequestError("Token không có hiệu lực hoặc hết hạn");
      }

      // If token exists but expired -> clear token fields and return error
      if (
         !user.passwordResetExpires ||
         user.passwordResetExpires.getTime() < Date.now()
      ) {
         user.passwordResetToken = undefined;
         user.passwordResetExpires = undefined;
         await user.save();
         throw new BadRequestError("Token không có hiệu lực hoặc hết hạn");
      }

      // Token valid
      user.password = newPassword;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();
   }

   // Change password
   async changePassword(
      userId: string,
      oldPassword: string,
      newPassword: string
   ): Promise<void> {
      const user = await User.findById(userId).select("+password");

      if (!user || !(await user.comparePassword!(oldPassword))) {
         throw new UnauthorizedError("Sai mật khẩu cũ");
      }

      user.password = newPassword;
      await user.save();
   }

   // Login with email and password
   async login(
      email: string,
      password: string
   ): Promise<{ token: string; user: IUser }> {
      const user = await User.findOne({ email }).select("+password");

      if (!user || !(await user.comparePassword!(password))) {
         throw new UnauthorizedError("Sai tài khoản hoặc mật khẩu");
      }

      if (!user.isVerifiedEmail) {
         throw new UnauthorizedError("Vui lòng xác nhận email của bạn trước");
      }

      if (user.isBanned) {
         throw new UnauthorizedError(
            "Tài khoản của bạn bị khoá, vui lòng liên hệ hỗ trợ."
         );
      }

      const token = this.createToken(user);
      user.password = undefined;
      return { token, user };
   }

   async googleLogin(idToken: string): Promise<{ token: string; user: IUser }> {
      const ticket = await googleClient.verifyIdToken({
         idToken,
         audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();

      if (!payload) {
         throw new BadRequestError("Invalid Google token");
      }

      const { email, name, picture } = payload;

      let user = await User.findOne({ email });

      // Changed: do NOT auto-create user on Google login — throw error if not found
      if (!user) {
         throw new UnauthorizedError(
            "Email này chưa được liên kết với bất kỳ tài khoản nào."
         );
      }

      if (user.isBanned) {
         throw new UnauthorizedError(
            "Tài khoản của bạn đã bị khoá, vui lòng liên hệ hỗ trợ."
         );
      }

      const token = this.createToken(user);
      const userResponse = user.toObject();
      delete userResponse.password;

      return { token, user: userResponse };
   }

   // new: verify token and return user + token
   async getUserFromToken(
      token: string
   ): Promise<{ token: string; user: IUser }> {
      try {
         const secret = process.env.JWT_SECRET as string;
         const payload = jwt.verify(token, secret) as any;
         const userId = payload?.id;
         if (!userId) {
            throw new UnauthorizedError("Invalid token payload");
         }
         const user = await User.findById(userId).select("-password");
         if (!user) {
            throw new UnauthorizedError("User not found");
         }

         if (user.isBanned) {
            throw new UnauthorizedError(
               "Tài khoản của bạn bị khoá, vui lòng liên hệ hỗ trợ"
            );
         }

         return { token, user };
      } catch (err) {
         throw new UnauthorizedError("Invalid or expired token");
      }
   }
}

export default new AuthService();
