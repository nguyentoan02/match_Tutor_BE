export const getVerificationEmailTemplate = (
    name: string,
    verificationUrl: string
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; }
        .header { background-color: #007bff; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .button { display: inline-block; padding: 12px 25px; margin: 20px 0; background-color: #007bff; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Welcome to MatchTutor!</h1>
        </div>
        <div class="content">
            <p>Hi ${name},</p>
            <p>Thank you for registering. Please click the button below to verify your email address and complete your registration.</p>
            <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            <p>If you did not create an account, no further action is required.</p>
            <p>This link will expire in 10 minutes.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

export const getPasswordResetEmailTemplate = (
    name: string,
    resetUrl: string
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; }
        .header { background-color: #dc3545; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .button { display: inline-block; padding: 12px 25px; margin: 20px 0; background-color: #dc3545; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        <div class="content">
            <p>Hi ${name},</p>
            <p>You requested a password reset. Please click the button below to set a new password.</p>
            <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
            </p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>This link will expire in 10 minutes.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;
