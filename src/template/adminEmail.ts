export const getBanNotificationEmailTemplate = (
    name: string,
    reason: string,
    bannedAt: string
): string => `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tài khoản bị tạm khóa</title>
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
            <h1>Tài khoản bị tạm khóa</h1>
        </div>
        <div class="content">
            <p>Xin chào ${name},</p>
            <p>Chúng tôi rất tiếc phải thông báo rằng tài khoản MatchTutor của bạn đã bị tạm khóa do vi phạm điều khoản dịch vụ của chúng tôi.</p>
            
            <div class="reason-box">
                <h3>Lý do tạm khóa:</h3>
                <p>${reason}</p>
                <p><strong>Thời gian tạm khóa:</strong> ${bannedAt}</p>
            </div>
            
            <p>Nếu bạn cho rằng việc tạm khóa này là nhầm lẫn, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi để được trợ giúp.</p>
            <p>Chúng tôi nghiêm túc thực hiện các quy tắc cộng đồng để đảm bảo môi trường học tập an toàn và tích cực cho tất cả người dùng.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. Bảo lưu mọi quyền.</p>
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
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tài khoản đã được khôi phục</title>
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
            <h1>Tài khoản đã được khôi phục</h1>
        </div>
        <div class="content">
            <p>Xin chào ${name},</p>
            <p>Tin tốt! Tài khoản MatchTutor của bạn đã được khôi phục và bạn có thể truy cập lại tất cả các tính năng.</p>
            <p><strong>Thời gian khôi phục:</strong> ${unbannedAt}</p>
            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'https://matchtutor.com'}" class="button">Truy cập tài khoản</a>
            </p>
            <p>Chúng tôi cảm ơn sự thấu hiểu của bạn và mong muốn mang đến cho bạn trải nghiệm học tập tốt nhất.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. Bảo lưu mọi quyền.</p>
        </div>
    </div>
</body>
</html>
`;

export const getTutorAcceptanceEmailTemplate = (
    name: string,
    approvedAt: string
): string => `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hồ sơ gia sư đã được duyệt</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; }
        .header { background-color: #28a745; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .success-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 25px; margin: 20px 0; background-color: #007bff; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Hồ sơ gia sư đã được duyệt!</h1>
        </div>
        <div class="content">
            <p>Xin chào ${name},</p>
            <p>Chúc mừng! Hồ sơ gia sư của bạn đã được duyệt và hiện đang hoạt động trên MatchTutor.</p>
            
            <div class="success-box">
                <h3>✅ Trạng thái hồ sơ: Đã duyệt</h3>
                <p><strong>Thời gian duyệt:</strong> ${approvedAt}</p>
                <p>Hồ sơ của bạn hiện đã hiển thị với học sinh và bạn có thể bắt đầu nhận yêu cầu dạy học!</p>
            </div>
            
            <p>Bước tiếp theo?</p>
            <ul>
                <li>Hoàn thiện hồ sơ của bạn với thông tin bổ sung</li>
                <li>Thiết lập lịch trình có sẵn của bạn</li>
                <li>Bắt đầu nhận và phản hồi yêu cầu từ học sinh</li>
                <li>Xây dựng danh tiếng thông qua việc giảng dạy xuất sắc</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'https://matchtutor.com'}/tutor/dashboard" class="button">Đi đến Bảng điều khiển</a>
            </p>
            
            <p>Chào mừng bạn đến với cộng đồng MatchTutor! Chúng tôi rất vui mừng có bạn là một phần của đội ngũ giảng dạy của chúng tôi.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. Bảo lưu mọi quyền.</p>
        </div>
    </div>
</body>
</html>
`;

export const getTutorRejectionEmailTemplate = (
    name: string,
    reason: string,
    rejectedAt: string
): string => `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Hồ sơ gia sư bị từ chối</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; }
        .header { background-color: #dc3545; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .reason-box { background-color: #f8f9fa; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; }
        .button { display: inline-block; padding: 12px 25px; margin: 20px 0; background-color: #007bff; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Hồ sơ gia sư bị từ chối</h1>
        </div>
        <div class="content">
            <p>Xin chào ${name},</p>
            <p>Cảm ơn bạn đã quan tâm đến việc trở thành gia sư trên MatchTutor. Sau khi xem xét kỹ lưỡng, chúng tôi rất tiếc phải thông báo rằng đơn đăng ký hồ sơ gia sư của bạn chưa được duyệt vào lúc này.</p>
            
            <div class="reason-box">
                <h3>Lý do từ chối:</h3>
                <p>${reason}</p>
                <p><strong>Thời gian từ chối:</strong> ${rejectedAt}</p>
            </div>
            
            <p>Đừng nản lòng! Bạn có thể:</p>
            <ul>
                <li>Khắc phục các vấn đề được đề cập ở trên</li>
                <li>Cải thiện trình độ và kinh nghiệm của bạn</li>
                <li>Nộp đơn lại trong tương lai khi bạn đáp ứng các yêu cầu của chúng tôi</li>
                <li>Liên hệ với đội ngũ hỗ trợ để được hướng dẫn thêm</li>
            </ul>
            
            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'https://matchtutor.com'}/contact" class="button">Liên hệ hỗ trợ</a>
            </p>
            
            <p>Chúng tôi cảm ơn sự thấu hiểu của bạn và chúc bạn thành công trên hành trình giảng dạy của mình.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. Bảo lưu mọi quyền.</p>
        </div>
    </div>
</body>
</html>
`;

export const getReportResolvedEmailTemplateForStudent = (
    studentName: string,
    tutorName: string,
    reportReason: string,
    resolvedAt: string,
    action: string
): string => `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo cáo vi phạm đã được xử lý</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; }
        .header { background-color: #28a745; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .info-box { background-color: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 15px 0; }
        .action-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Báo cáo vi phạm đã được xử lý</h1>
        </div>
        <div class="content">
            <p>Xin chào ${studentName},</p>
            <p>Cảm ơn bạn đã báo cáo vi phạm. Chúng tôi đã xem xét và xử lý báo cáo của bạn về gia sư <strong>${tutorName}</strong>.</p>
            
            <div class="info-box">
                <h3>📋 Thông tin báo cáo:</h3>
                <p><strong>Lý do báo cáo:</strong> ${reportReason}</p>
                <p><strong>Thời gian xử lý:</strong> ${resolvedAt}</p>
            </div>
            
            <div class="action-box">
                <h3>🔧 Hành động đã thực hiện:</h3>
                <p>${action}</p>
            </div>
            
            <p>Chúng tôi cam kết duy trì một môi trường học tập an toàn và minh bạch cho tất cả người dùng. Cảm ơn bạn đã góp phần xây dựng cộng đồng MatchTutor tốt đẹp hơn.</p>
            
            <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. Bảo lưu mọi quyền.</p>
        </div>
    </div>
</body>
</html>
`;

export const getReportResolvedEmailTemplateForTutor = (
    tutorName: string,
    reportReason: string,
    resolvedAt: string,
    action: string
): string => `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông báo về báo cáo vi phạm</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; }
        .header { background-color: #ffc107; color: #333; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .warning-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
        .action-box { background-color: #f8d7da; border-left: 4px solid #dc3545; padding: 15px; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Thông báo về báo cáo vi phạm</h1>
        </div>
        <div class="content">
            <p>Xin chào ${tutorName},</p>
            <p>Chúng tôi muốn thông báo rằng đã có báo cáo vi phạm về tài khoản của bạn và chúng tôi đã xem xét, xử lý báo cáo này.</p>
            
            <div class="warning-box">
                <h3>📋 Thông tin báo cáo:</h3>
                <p><strong>Lý do báo cáo:</strong> ${reportReason}</p>
                <p><strong>Thời gian xử lý:</strong> ${resolvedAt}</p>
            </div>
            
            <div class="action-box">
                <h3>🔧 Hành động đã thực hiện:</h3>
                <p>${action}</p>
            </div>
            
            <p>Chúng tôi khuyến khích bạn tuân thủ các quy tắc và điều khoản của MatchTutor để đảm bảo trải nghiệm tốt nhất cho tất cả người dùng.</p>
            
            <p>Nếu bạn có bất kỳ câu hỏi hoặc muốn khiếu nại về quyết định này, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
            
            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'https://matchtutor.com'}/contact" style="display: inline-block; padding: 12px 25px; margin: 20px 0; background-color: #007bff; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold;">Liên hệ hỗ trợ</a>
            </p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. Bảo lưu mọi quyền.</p>
        </div>
    </div>
</body>
</html>
`;

export const getReportRejectedEmailTemplateForStudent = (
    studentName: string,
    tutorName: string,
    reportReason: string,
    rejectedAt: string,
    adminNote?: string
): string => `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Báo cáo vi phạm không được chấp nhận</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; }
        .header { background-color: #6c757d; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .info-box { background-color: #f8f9fa; border-left: 4px solid #6c757d; padding: 15px; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📋 Báo cáo vi phạm không được chấp nhận</h1>
        </div>
        <div class="content">
            <p>Xin chào ${studentName},</p>
            <p>Cảm ơn bạn đã báo cáo vi phạm. Sau khi xem xét kỹ lưỡng, chúng tôi đã quyết định không chấp nhận báo cáo của bạn về gia sư <strong>${tutorName}</strong>.</p>
            
            <div class="info-box">
                <h3>📋 Thông tin báo cáo:</h3>
                <p><strong>Lý do báo cáo:</strong> ${reportReason}</p>
                <p><strong>Thời gian xử lý:</strong> ${rejectedAt}</p>
                ${adminNote ? `<p><strong>Ghi chú từ admin:</strong> ${adminNote}</p>` : ''}
            </div>
            
            <p>Chúng tôi đánh giá cao sự cảnh giác của bạn trong việc bảo vệ cộng đồng. Nếu bạn có thêm thông tin hoặc bằng chứng mới, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
            
            <p>Cảm ơn bạn đã góp phần xây dựng cộng đồng MatchTutor tốt đẹp hơn.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. Bảo lưu mọi quyền.</p>
        </div>
    </div>
</body>
</html>
`;

export const getTutorBannedEmailTemplateForStudent = (
    studentName: string,
    tutorName: string,
    bannedAt: string,
    reason?: string
): string => `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thông báo về gia sư bị tạm khóa</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px; background-color: #ffffff; }
        .header { background-color: #dc3545; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { padding: 20px; }
        .warning-box { background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; }
        .action-box { background-color: #e7f3ff; border-left: 4px solid #007bff; padding: 15px; margin: 15px 0; }
        .footer { margin-top: 20px; font-size: 0.8em; text-align: center; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Thông báo quan trọng về gia sư</h1>
        </div>
        <div class="content">
            <p>Xin chào ${studentName},</p>
            <p>Chúng tôi muốn thông báo rằng gia sư <strong>${tutorName}</strong> mà bạn đang có cam kết học tập đã bị tạm khóa tài khoản do vi phạm điều khoản dịch vụ của MatchTutor.</p>
            
            <div class="warning-box">
                <h3>📋 Thông tin:</h3>
                <p><strong>Gia sư:</strong> ${tutorName}</p>
                <p><strong>Thời gian tạm khóa:</strong> ${bannedAt}</p>
                ${reason ? `<p><strong>Lý do:</strong> ${reason}</p>` : ''}
            </div>
            
            <div class="action-box">
                <h3>🔧 Các hành động đã được thực hiện:</h3>
                <ul>
                    <li>Hồ sơ gia sư đã bị ẩn khỏi hệ thống</li>
                    <li>Tất cả các cam kết học tập đang hoạt động đã được hủy</li>
                    <li>Tất cả các buổi học sắp tới đã được hủy</li>
                    <li>Các yêu cầu dạy học chưa được xử lý đã bị từ chối</li>
                </ul>
            </div>
            
            <p><strong>Về cam kết học tập của bạn:</strong></p>
            <p>Nếu bạn đã thanh toán cho các buổi học chưa diễn ra, chúng tôi sẽ xử lý hoàn tiền theo chính sách của MatchTutor. Vui lòng kiểm tra tài khoản của bạn hoặc liên hệ với đội ngũ hỗ trợ nếu bạn có bất kỳ câu hỏi nào.</p>
            
            <p>Chúng tôi rất tiếc về sự bất tiện này và cam kết đảm bảo trải nghiệm học tập tốt nhất cho bạn. Chúng tôi khuyến khích bạn tìm một gia sư mới phù hợp trên nền tảng của chúng tôi.</p>
            
            <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL || 'https://matchtutor.com'}/student/tutors" style="display: inline-block; padding: 12px 25px; margin: 20px 0; background-color: #007bff; color: white !important; text-decoration: none; border-radius: 5px; font-weight: bold;">Tìm gia sư mới</a>
            </p>
            
            <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với đội ngũ hỗ trợ của chúng tôi.</p>
        </div>
        <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MatchTutor. Bảo lưu mọi quyền.</p>
        </div>
    </div>
</body>
</html>
`;