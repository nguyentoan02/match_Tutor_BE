export const getVerificationEmailTemplate = (
   name: string,
   verificationUrl: string
): string => `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Xác minh Email</title>
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
            <h1>Chào mừng đến MatchTutor!</h1>
        </div>
        <div class="content">
            <p>Xin chào ${name},</p>
            <p>Cảm ơn bạn đã đăng ký. Vui lòng nhấp vào nút dưới đây để xác minh địa chỉ email của bạn và hoàn thành quá trình đăng ký.</p>
            <p style="text-align: center;">
                <a href="${verificationUrl}" class="button">Xác minh Địa chỉ Email</a>
            </p>
            <p>Nếu bạn không tạo tài khoản này, vui lòng bỏ qua email này.</p>
            <p>Liên kết này sẽ hết hạn trong 15 phút.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. Bảo lưu mọi quyền.</p>
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
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Đặt lại Mật khẩu</title>
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
            <h1>Yêu cầu Đặt lại Mật khẩu</h1>
        </div>
        <div class="content">
            <p>Xin chào ${name},</p>
            <p>Bạn đã yêu cầu đặt lại mật khẩu. Vui lòng nhấp vào nút dưới đây để đặt mật khẩu mới.</p>
            <p style="text-align: center;">
                <a href="${resetUrl}" class="button">Đặt lại Mật khẩu</a>
            </p>
            <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
            <p>Liên kết này sẽ hết hạn trong 15 phút.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. Bảo lưu mọi quyền.</p>
        </div>
    </div>
</body>
</html>
`;
