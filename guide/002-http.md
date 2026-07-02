# Creating a Native HTTP Server in Node.js

The `http` module is a core built-in module in Node.js that allows you to transfer data over HTTP (HyperText Transfer Protocol) and create web servers without external libraries.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
HTTP is a application-layer protocol built on top of TCP/IP. It operates on a client-server paradigm:
1. A client (e.g., a browser) opens a TCP socket connection to a specific port on the server.
2. The client transmits a raw text payload formatting request details (method, headers, body).
3. The server interprets this text block, executes logic, and sends back an HTTP formatted text response containing headers and a body (e.g., HTML, JSON).
4. The socket is closed or kept alive for subsequent transfers.

The Node.js native `http` module provides an event-based wrapper around TCP socket connections, handling the raw text serialization under the hood.

---

## 2. Theory & Deep Dive

### Core Architecture
Before express-based web frameworks gained popularity, Node.js applications relied directly on the built-in `http` module. This module provides low-level control over network connections, HTTP request parsing, and response streaming.

### Why use Native HTTP vs Express?
- **Native HTTP**: Minimal performance overhead, zero third-party dependencies, highly specialized. Good for extremely simple web endpoints.
- **Express**: Built on top of Native HTTP. Provides helper APIs for routing patterns, cookies handling, error catch-points, and middleware execution. Essential for complex production web applications.

---

## 3. Basic Code Implementation

Here is how you construct a basic HTTP server using CommonJS:

```javascript
const http = require("http");

// Define Server Port
const PORT = 3000;

// Create HTTP Server instance
const server = http.createServer((req, res) => {
  // Logging requested URL and Method
  console.log(`Received request: ${req.method} ${req.url}`);

  // Setting the content type response header to HTML
  res.setHeader("Content-Type", "text/html");

  // Basic Routing
  if (req.url === "/") {
    res.statusCode = 200;
    res.write("<h1>Welcome to the Native Node.js HTTP Server!</h1>");
    res.write("<p>Visit <a href='/about'>/about</a> to read more.</p>");
    res.end();
  } else if (req.url === "/about") {
    res.statusCode = 200;
    res.end("<h1>About Page</h1><p>This server was built using the native HTTP module.</p>");
  } else {
    // 404 Not Found fallback
    res.statusCode = 404;
    res.end("<h1>404 Not Found</h1><p>The requested page does not exist.</p>");
  }
});

// Start listening for traffic
server.listen(PORT, () => {
  console.log(`Native HTTP server is running on http://localhost:${PORT}`);
});
```

---

## 4. Self-Contained Mini-Project: Static File Web Server with Custom Routing

We will build a server that serves physical `.html` files from a folder dynamically depending on the URL pathname, resolving Content-Type headers properly.

### Project Setup
```text
http-static-server/
├── public/
│   ├── index.html
│   └── 404.html
└── server.js
```

### File: `public/index.html`
```html
<!DOCTYPE html>
<html>
<head><title>Home Page</title></head>
<body>
  <h1>Native Server Home</h1>
  <p>This page was served directly from the disk using native Node.js streams.</p>
</body>
</html>
```

### File: `public/404.html`
```html
<!DOCTYPE html>
<html>
<head><title>Page Not Found</title></head>
<body>
  <h1 style="color:red;">Error: Page Not Found</h1>
  <p>The requested path doesn't exist on our disk storage.</p>
</body>
</html>
```

### File: `server.js`
```javascript
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

const server = http.createServer((req, res) => {
  console.log(`Request received: ${req.method} ${req.url}`);

  // Map URL pathname to public folder
  let filePath = path.join(__dirname, "public", req.url === "/" ? "index.html" : req.url);

  // Read file and stream response
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === "ENOENT") {
        // File not found -> Return 404.html
        fs.readFile(path.join(__dirname, "public", "404.html"), (err404, content404) => {
          res.writeHead(404, { "Content-Type": "text/html" });
          res.end(content404, "utf-8");
        });
      } else {
        // Internal server file error
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      // Success -> Return file content
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(content, "utf-8");
    }
  });
});

server.listen(PORT, () => {
  console.log(`Static server active at http://localhost:${PORT}`);
});
```

---

## 5. Advanced Production Practices & Security

### Request Flood/Buffer Attacks
Because raw Node.js HTTP servers process incoming requests as stream packets, a malicious client can open a connection and send infinite payload bytes without ending the request. This floods the server memory, leading to crashes. 
- In production, set **timeouts** (`server.headersTimeout` and `server.requestTimeout`).
- Cap incoming request body buffers.

### HTTP Header Injection
If you directly inject user query input parameters inside headers via `res.setHeader(name, value)`, attackers could execute HTTP Response Splitting attacks. Always sanitize inputs before injecting them into headers.

---

## 6. Key Takeaways
1. The callback of `http.createServer` runs every time the server receives an incoming HTTP request.
2. `req` (Request) is an instance of `http.IncomingMessage`, used to read incoming request headers, URL parameters, and request body streams.
3. `res` (Response) is an instance of `http.ServerResponse`, which you must call `.end()` on to terminate the request-response cycle and send the headers/content back to the client.
4. Native HTTP lacks advanced router capabilities, which is why frameworks like **Express** are used to provide clean abstractions.
