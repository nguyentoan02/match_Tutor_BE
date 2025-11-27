import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
   pool: true,
   maxConnections: 5,
   maxMessages: 100,
   host: process.env.EMAIL_HOST,
   port: Number(process.env.EMAIL_PORT),
   secure: false,
   auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
   },
});
