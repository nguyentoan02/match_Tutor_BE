import { transporter } from "../config/mail";
import {
   getVerificationEmailTemplate,
   getPasswordResetEmailTemplate,
} from "../template/emailAuth";
import { addEmailJob } from "../queues/email.queue";

export const sendVerificationEmail = async (
   to: string,
   name: string,
   verificationUrl: string
) => {
   const mailOptions = {
      from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Verify Your Email Address for MatchTutor",
      html: getVerificationEmailTemplate(name, verificationUrl),
   };

   // Thay vì gửi trực tiếp, đẩy vào queue
   await addEmailJob(mailOptions);
};

export const sendPasswordResetEmail = async (
   to: string,
   name: string,
   resetUrl: string
) => {
   const mailOptions = {
      from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your Password Reset Link for MatchTutor",
      html: getPasswordResetEmailTemplate(name, resetUrl),
   };

   // Thay vì gửi trực tiếp, đẩy vào queue
   await addEmailJob(mailOptions);
};
