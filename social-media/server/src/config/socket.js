// server/src/config/socket.js
// Socket.io real-time messaging server

const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const userModel = require("../models/user");

// Track online users: Map<userId, Set<socketId>>
const onlineUsers = new Map();

function initSocket(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:5000", "http://127.0.0.1:5000"],
            credentials: true,
        },
    });

    // Auth middleware — verify JWT before allowing connection
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error("Authentication required"));
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await userModel.findById(decoded.id);
            if (!user) {
                return next(new Error("User not found"));
            }
            socket.userId = user._id.toString();
            socket.username = user.username;
            next();
        } catch (err) {
            next(new Error("Invalid token"));
        }
    });

    io.on("connection", (socket) => {
        const userId = socket.userId;
        console.log(`🔌 User connected: ${socket.username} (${userId})`);

        // Track this socket for the user
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Broadcast online status
        io.emit("userOnline", { userId, username: socket.username });

        // Send current online users list to the newly connected client
        const onlineList = Array.from(onlineUsers.keys());
        socket.emit("onlineUsers", onlineList);

        // ─── Real-time message relay ─────────────────────────
        socket.on("sendMessage", (data) => {
            const { receiverId, encryptedMessage, encryptedKey, iv, messageId } = data;

            // Relay to all sockets of the receiver
            const receiverSockets = onlineUsers.get(receiverId);
            if (receiverSockets) {
                receiverSockets.forEach((socketId) => {
                    io.to(socketId).emit("receiveMessage", {
                        senderId: userId,
                        senderName: socket.username,
                        encryptedMessage,
                        encryptedKey,
                        iv,
                        messageId,
                        createdAt: new Date().toISOString(),
                    });
                });
            }
        });

        // ─── Typing indicators ───────────────────────────────
        socket.on("typing", ({ receiverId }) => {
            const receiverSockets = onlineUsers.get(receiverId);
            if (receiverSockets) {
                receiverSockets.forEach((socketId) => {
                    io.to(socketId).emit("userTyping", {
                        userId,
                        username: socket.username,
                    });
                });
            }
        });

        socket.on("stopTyping", ({ receiverId }) => {
            const receiverSockets = onlineUsers.get(receiverId);
            if (receiverSockets) {
                receiverSockets.forEach((socketId) => {
                    io.to(socketId).emit("userStoppedTyping", {
                        userId,
                    });
                });
            }
        });

        // ─── Disconnect ─────────────────────────────────────
        socket.on("disconnect", () => {
            console.log(`🔌 User disconnected: ${socket.username}`);
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                    io.emit("userOffline", { userId });
                }
            }
        });
    });

    return io;
}

module.exports = initSocket;
