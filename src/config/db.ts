import mongoose from "mongoose";

export const connectDB = async () => {
    try {
        const options: mongoose.ConnectOptions = {
            autoIndex: false, // Tắt autoIndex trong môi trường production để tăng hiệu suất
            maxPoolSize: 10, // Giới hạn số lượng kết nối trong pool
            serverSelectionTimeoutMS: 5000, // Timeout khi không thể kết nối đến server
            socketTimeoutMS: 45000, // Timeout cho socket
        };

        const conn = await mongoose.connect(
            process.env.MONGO_URI as string,
            options
        );

        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error("❌ MongoDB connection failed", error);

        // Tắt ứng dụng nếu không thể kết nối đến database
        process.exit(1);
    }
};
