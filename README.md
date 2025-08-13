# MatchTutor Backend

## Tổng quan

Dự án này là backend cho ứng dụng MatchTutor, được xây dựng bằng **Node.js**, **Express**, **TypeScript**, và **MongoDB**. Nó cung cấp các API để quản lý người dùng và xác thực, bao gồm các tính năng như tạo, lấy, cập nhật và xóa người dùng.

## Cấu trúc thư mục

Dự án được tổ chức như sau:

```
.env
.env.example
.gitignore
package.json
tsconfig.json
src/
    app.ts
    server.ts
    config/
        db.ts
    controllers/
        user.controller.ts
    middlewares/
        error.middleware.ts
        validation.middleware.ts
    models/
        user.model.ts
    routes/
        routeRegistry.ts
        user.route.ts
    schemas/
        index.ts
        user.schema.ts
    services/
        user.service.ts
    template/
    types/
        user.ts
    utils/
        error.response.ts
        httpStatus.ts
        success.response.ts
```

### Ý nghĩa các file/thư mục

-   **`.env`**: Chứa các biến môi trường cho ứng dụng (không được đưa vào hệ thống kiểm soát phiên bản).
-   **`.env.example`**: File mẫu để thiết lập `.env`.
-   **`package.json`**: Định nghĩa các phụ thuộc và script của dự án.
-   **`tsconfig.json`**: File cấu hình TypeScript.
-   **`src/`**: Thư mục chứa mã nguồn chính.
    -   **`app.ts`**: Khởi tạo ứng dụng Express, middleware và routes.
    -   **`server.ts`**: Khởi động server và lắng nghe trên cổng được chỉ định.
    -   **`config/db.ts`**: Thiết lập kết nối MongoDB.
    -   **`controllers/`**: Chứa logic xử lý các yêu cầu API.
        -   **`user.controller.ts`**: Xử lý logic liên quan đến API người dùng.
    -   **`middlewares/`**: Chứa các middleware để xác thực và xử lý lỗi.
        -   **`error.middleware.ts`**: Xử lý lỗi toàn cục.
        -   **`validation.middleware.ts`**: Xác thực dữ liệu yêu cầu bằng Zod schemas.
    -   **`models/`**: Định nghĩa các model Mongoose để tương tác với cơ sở dữ liệu.
        -   **`user.model.ts`**: Schema model người dùng.
    -   **`routes/`**: Định nghĩa các API routes.
        -   **`routeRegistry.ts`**: Tự động đăng ký tất cả các routes. Đặt tên file route như nào là tự tạo đường dẫn url như thế: const apiPath = `/${routeName}`; // user.route.ts -> /user
        -   **`user.route.ts`**: Routes cho các thao tác liên quan đến người dùng.
    -   **`schemas/`**: Chứa các Zod schemas để xác thực yêu cầu.
        -   **`user.schema.ts`**: Schema xác thực cho các yêu cầu liên quan đến người dùng.
    -   **`services/`**: Chứa logic nghiệp vụ để tương tác với các model.
        -   **`user.service.ts`**: Thực hiện các thao tác liên quan đến người dùng.
    -   **`types/`**: Định nghĩa các kiểu dữ liệu TypeScript.
        -   **`user.ts`**: Kiểu dữ liệu cho model người dùng.
    -   **`utils/`**: Các lớp tiện ích và hằng số.
        -   **`error.response.ts`**: Định nghĩa các lớp phản hồi lỗi.
        -   **`httpStatus.ts`**: Mã trạng thái HTTP và lý do.
        -   **`success.response.ts`**: Định nghĩa các lớp phản hồi thành công.

## Cách chạy

### Yêu cầu

-   Node.js (phiên bản 16 hoặc cao hơn)
-   MongoDB (cục bộ hoặc instance trên cloud)
-   Cài đặt các phụ thuộc bằng lệnh `npm install`.

### Các bước

1. **Thiết lập biến môi trường**:

    - Tạo file `.env` dựa trên `.env.example`.
    - Điền `MONGO_URI` với chuỗi kết nối MongoDB của bạn.

2. **Chạy server phát triển**:

    ```sh
    npm run dev
    ```

3. **Build dự án**:

    ```sh
    npm run build
    ```

4. **Khởi động server sản xuất**:
    ```sh
    npm start
    ```

### Các API Endpoint

Các API routes được tiền tố bằng `/api`. Ví dụ:

-   `POST /api/users`: Tạo người dùng mới.
-   `GET /api/users`: Lấy danh sách tất cả người dùng.
-   `GET /api/users/:id`: Lấy thông tin người dùng theo ID.
-   `PUT /api/users/:id`: Cập nhật thông tin người dùng.
-   `DELETE /api/users/:id`: Xóa người dùng.

## Ghi chú

-   Dự án sử dụng **Zod** để xác thực yêu cầu và **Mongoose** để tương tác với cơ sở dữ liệu.
-   Xử lý lỗi được tập trung tại file `error.middleware.ts`.
-   Các phản hồi thành công và lỗi tuân theo cấu trúc nhất quán được định nghĩa trong `success.response.ts` và `error.response.ts`.
