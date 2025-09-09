import { transporter } from "../config/mail";
import {
    getVerificationEmailTemplate,
    getPasswordResetEmailTemplate,
} from "../template/emailAuth";

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

    await transporter.sendMail(mailOptions);
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

    await transporter.sendMail(mailOptions);
};
