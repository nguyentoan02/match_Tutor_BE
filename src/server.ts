import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import socketService from "./socket/chatSocket";
import notificationSocketService from "./socket/notificationSocket";

const PORT = process.env.PORT || 5000;
const NOTIFICATION_PORT = process.env.NOTIFICATION_PORT || 3002;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
socketService.initialize(server);

const notificationServer = http.createServer();
notificationSocketService.initialize(
   notificationServer,
   parseInt(NOTIFICATION_PORT.toString())
);

notificationServer.listen(NOTIFICATION_PORT, () => {
   console.log(`Notification Socket server is running on port ${NOTIFICATION_PORT}`);
});

server.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
   console.log(`Socket.IO initialized`);
});
