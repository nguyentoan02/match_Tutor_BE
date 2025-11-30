import { z } from "zod";
import { Role } from "../types/enums/role.enum";

export const registerSchema = z.object({
   body: z.object({
      // name: z
      //    .string()
      //    .trim()
      //    .min(2, "Tên phải ít nhất 2 ký tự")
      //    .max(50, "Tên không vượt quá 50 ký tự")
      //    .nonempty("Tên không được để trống"),

      email: z.preprocess(
         (val) => (typeof val === "string" ? val.trim().toLowerCase() : val),
         z.email({ message: "Email không hợp lệ" })
      ),

      password: z
         .string()
         .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
         .max(20, "Mật khẩu không được vượt quá 20 ký tự")
         .regex(
            /(?=.*[A-Z])(?=.*[^A-Za-z0-9]).*/,
            "Mật khẩu phải chứa ít nhất 1 ký tự in hoa và 1 ký tự đặc biệt"
         ),

      role: z.enum(Role).optional(),
   }),
});

export const loginSchema = z.object({
   body: z.object({
      email: z.string(),
      password: z.string(),
   }),
});

export const googleLoginSchema = z.object({
   body: z.object({
      idToken: z.string(),
   }),
});

export const verifyEmailSchema = z.object({
   query: z.object({
      token: z.string(),
   }),
});

export const forgotPasswordSchema = z.object({
   body: z.object({
      email: z.string().email({ message: "Email không hợp lệ" }),
   }),
});

export const resetPasswordSchema = z.object({
   body: z.object({
      token: z.string().nonempty("Token không được để trống"),
      password: z
         .string()
         .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
         .max(20, "Mật khẩu không được vượt quá 20 ký tự")
         .regex(
            /(?=.*[A-Z])(?=.*[^A-Za-z0-9]).*/,
            "Mật khẩu phải chứa ít nhất 1 ký tự in hoa và 1 ký tự đặc biệt"
         ),
   }),
});

export const changePasswordSchema = z.object({
   body: z.object({
      oldPassword: z.string(),
      newPassword: z
         .string()
         .min(6, "Mật khẩu phải có ít nhất 6 ký tự")
         .max(20, "Mật khẩu không được vượt quá 20 ký tự")
         .regex(
            /(?=.*[A-Z])(?=.*[^A-Za-z0-9]).*/,
            "Mật khẩu phải chứa ít nhất 1 ký tự in hoa và 1 ký tự đặc biệt"
         ),
   }),
});
