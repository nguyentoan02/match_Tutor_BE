import { transporter } from "../config/mail";
import {
   getParentRequestAddChildEmailTemplate,
   getParentRequestEmailTemplate,
} from "../template/parentRequestEmail";

export const sendParentRequestEmail = async (
   parentEmail: string,
   parentName: string,
   studentName: string,
   relationship: string,
   activeUrl: string
) => {
   const mailOption = {
      from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
      to: parentEmail,
      subject: "kích hoạt tài khoản phụ huynh cho MatchTutor",
      html: getParentRequestEmailTemplate(
         parentName,
         studentName,
         activeUrl,
         relationship
      ),
   };

   await transporter.sendMail(mailOption);
};

export const sendParentRequestAddChildEmail = async (
   parentEmail: string,
   parentName: string,
   studentName: string,
   relationship: string,
   inviteUrl: string
) => {
   const mailOption = {
      from: `"MatchTutor" <${process.env.EMAIL_USER}>`,
      to: parentEmail,
      subject: "Lời mời tham gia MatchTutor",
      html: getParentRequestAddChildEmailTemplate(
         parentName,
         studentName,
         relationship,
         inviteUrl
      ),
   };

   await transporter.sendMail(mailOption);
};
