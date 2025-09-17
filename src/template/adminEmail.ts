export const getBanNotificationEmailTemplate = (
    name: string,
    reason: string,
    bannedAt: string
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Suspended</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; }
        .header { background-color: #dc3545; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .reason-box { background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Account Suspended</h1>
        </div>
        <div class="content">
            <p>Hi ${name},</p>
            <p>We regret to inform you that your MatchTutor account has been suspended due to a violation of our terms of service.</p>
            
            <div class="reason-box">
                <h3>Reason for suspension:</h3>
                <p>${reason}</p>
                <p><strong>Suspended on:</strong> ${bannedAt}</p>
            </div>
            
            <p>If you believe this suspension was made in error, please contact our support team for assistance.</p>
            <p>We take our community guidelines seriously to ensure a safe and positive learning environment for all users.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

export const getUnbanNotificationEmailTemplate = (
    name: string,
    unbannedAt: string
): string => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Restored</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; }
        .header { background-color: #28a745; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .button { display: inline-block; padding: 12px 25px; margin: 20px 0; background-color: #28a745; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Account Restored</h1>
        </div>
        <div class="content">
            <p>Hi ${name},</p>
            <p>Great news! Your MatchTutor account has been restored and you can now access all features again.</p>
            <p><strong>Restored on:</strong> ${unbannedAt}</p>
            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'https://matchtutor.com'}" class="button">Access Your Account</a>
            </p>
            <p>We appreciate your understanding and look forward to providing you with the best learning experience.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;
