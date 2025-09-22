import z from "zod";
import { Relationship } from "../types/enums";

export const parentRequestBody = z.object({
   body: z.object({
      parentEmail: z.string().email("Invalid email format"),
      parentName: z.string().min(1, "Parent name is required").max(100),
      relationship: z.nativeEnum(Relationship, "Invalid relationship type"),
   }),
});

export const parentRequestTokenRequest = z.object({
   query: z.object({
      activeToken: z.string("Active token is required"),
   }),
   body: z.object({
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

export const parentRequestAcceptTokenRequest = z.object({
   query: z.object({
      acceptToken: z.string("Accept token is required"),
   }),
});
