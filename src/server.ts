import dotenv from "dotenv";
dotenv.config();

import http from "http";
import app from "./app";
import socketService from "./socket/chatSocket";

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
socketService.initialize(server);

server.listen(PORT, () => {
   console.log(`Server running on port ${PORT}`);
   console.log(`Socket.IO initialized`);
});
