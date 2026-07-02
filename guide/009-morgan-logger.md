# Morgan Request Logger Middleware

Morgan is an HTTP request logger middleware for Node.js. It simplifies logging details about incoming requests, such as the request method, URL, status code, response time, and content length.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
When running a web backend, you need a way to trace how users interact with your endpoints. Logging every incoming request provides an audit trail to help you diagnose errors, trace performance bottlenecks, and monitor security events (like brute-force attacks).
Instead of writing manual logging statements (e.g. `console.log(req.method)`) inside every route handler, Morgan acts as a global middleware that automatically hooks into the server's request-response lifecycle. It logs request metadata as soon as a response is sent back to the client.

---

## 2. Theory & Deep Dive

### Predefined Log Formats
- **`dev`**: Clean, color-coded status output (red for errors, green for success) tailored for fast console debugging during development.
- **`combined`**: Production standard Apache format containing client IP, dates, user-agents, HTTP versions, and status codes.
- **`tiny`**: Minimalist output containing only method, path, status, size, and response time.

---

## 3. Code Implementation

Here is an example setup using Morgan with different predefined logging formats:

```javascript
const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const app = express();

const PORT = 3000;

// Option 1: Standard predefined formats
app.use(morgan("dev"));

// Option 2: Log requests into a text file for production audits
const logFilePath = path.join(__dirname, "access.log");
const writeLogStream = fs.createWriteStream(logFilePath, { flags: "a" }); // append mode
app.use(morgan("combined", { stream: writeLogStream }));

// Option 3: Creating dynamic custom tokens
morgan.token("id", (req) => {
  return req.headers["x-request-id"] || "anonymous";
});
app.use(morgan(":method :url :status - user-id: :id - :response-time ms"));
```

---

## 4. Self-Contained Mini-Project: Server Request Audit Logger

We will build an audit server that records incoming traffic inside a text file, and exposes a secure dashboard endpoint displaying the log entries.

### Project Setup
```text
express-morgan-audit/
├── server.js
└── package.json (requires: express, morgan)
```

### File: `server.js`
```javascript
const express = require("express");
const morgan = require("morgan");
const fs = require("fs");
const path = require("path");
const app = express();

const logFile = path.join(__dirname, "audit.log");
const logStream = fs.createWriteStream(logFile, { flags: "a" });

// Custom structured log token format
app.use(morgan(":method | Path: :url | Status: :status | Time: :response-time ms", { stream: logStream }));
app.use(morgan("dev")); // Also print to console for development convenience

app.get("/api/products", (req, res) => {
  res.json([{ id: 1, name: "Book" }, { id: 2, name: "Pen" }]);
});

app.get("/api/checkout", (req, res) => {
  res.status(400).json({ error: "Empty cart" });
});

// Admin Route to view audit trail
app.get("/admin/logs", (req, res) => {
  fs.readFile(logFile, "utf-8", (err, data) => {
    if (err) {
      return res.status(500).send("Unable to read logs.");
    }
    const lines = data.trim().split("\n");
    let logsHtml = lines.map(line => `<li>${line}</li>`).join("");
    
    res.send(`
      <h2>System Audit Logs</h2>
      <ul>${logsHtml}</ul>
      <a href="/admin/logs">Refresh Logs</a>
    `);
  });
});

app.listen(3000, () => console.log("Audit log server active at http://localhost:3000/admin/logs"));
```

---

## 5. Advanced Production Practices & Security

### Sanitizing Sensitive Parameters
By default, standard logging libraries can expose credentials like authorization headers, credit card tokens, or plain text passwords. **Never log sensitive data.**
- Customize tokens in Morgan to redact or sanitize request bodies and header parameters before writing them to disk.

### Log Rotation
If a server logs millions of requests to a single `access.log` file, the file size will eventually grow large enough to consume all available disk space, making it difficult to read.
- **Production Solution**: Use helper packages like `file-stream-rotator` alongside Morgan to automatically split log files by date (e.g. `access-2026-07-02.log`) and delete logs older than 30 days.

---

## 6. Key Takeaways
1. Position Morgan near the very top of your middleware stack (before route declarations) to ensure all incoming requests are logged.
2. In development, `"dev"` is the preferred format due to color-coded status outputs.
3. In production, prefer the `"combined"` format and redirect the output stream to a persistent write stream (`access.log`), or integrate it with cloud logging systems.
