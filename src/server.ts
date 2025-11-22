import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import socketService from "./socket/chatSocket";
import { Server } from "socket.io";
import notificationSocketService from "./socket/notificationSocket";

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

const io = new Server(server, {
   cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173/",
   },
});

// 3. Sử dụng Namespaces để tách biệt logic
const chatNamespace = io.of("/chat");
const notificationNamespace = io.of("/notifications");

socketService.initialize(chatNamespace);
notificationSocketService.initialize(notificationNamespace);

// Initialize Socket.IO
// socketService.initialize(server);

server.listen(PORT, () => {
   console.log(`🚀 Server running on port ${PORT}`);
   console.log(`💬 Chat service initialized`);
   console.log(`📢 Notification service initialized`);
   console.log(`🌐 Socket.IO services available at ws://localhost:${PORT}`);
});
