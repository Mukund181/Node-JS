// server/src/app.js
// Express application configuration — middleware, routes, static files
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const authRouter = require("./routes/auth");
const chatsRouter = require("./routes/chats");
const postsRouter = require("./routes/posts");

const app = express();

// ─── Body parsers ────────────────────────────────────────────────
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ─── CORS — allow credentials with specific origin ──────────────
app.use(
    cors({
        origin: ["http://localhost:5000", "http://127.0.0.1:5000"],
        credentials: true,
    })
);

// ─── Cookies ─────────────────────────────────────────────────────
app.use(cookieParser());

// ─── Serve static client files ───────────────────────────────────
app.use(express.static(path.join(__dirname, "../../client")));

// ─── API Routes ──────────────────────────────────────────────────
app.use("/api/auth", authRouter);
app.use("/api/messages", chatsRouter);
app.use("/api/posts", postsRouter);

// ─── Health check ────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── SPA catch-all — serve index.html for unmatched routes ──────
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../../client/index.html"));
});

module.exports = app;