// server.js — Single entry point for ConnectSpace backend
require("dotenv").config();

const http = require("http");
const app = require("./src/app.js");
const connectDB = require("./src/config/db.js");
const configCloudinary = require("./src/config/cloudinary.js");
const initSocket = require("./src/config/socket.js");

const PORT = process.env.PORT || 5000;

async function startServer() {
    // 1. Connect to MongoDB
    await connectDB();

    // 2. Configure Cloudinary
    configCloudinary();

    // 3. Create HTTP server from Express app
    const server = http.createServer(app);

    // 4. Attach Socket.io to the server
    const io = initSocket(server);

    // Make io accessible from routes if needed
    app.set("io", io);

    // 5. Start listening
    server.listen(PORT, () => {
        console.log(`\n✦ ConnectSpace server running at http://localhost:${PORT}`);
        console.log(`  ├─ API:       http://localhost:${PORT}/api`);
        console.log(`  ├─ Client:    http://localhost:${PORT}`);
        console.log(`  └─ Socket.io: ws://localhost:${PORT}\n`);
    });
}

startServer().catch((err) => {
    console.error("Failed to start server:", err);
    process.exit(1);
});