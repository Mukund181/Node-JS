# CORS (Cross-Origin Resource Sharing)

CORS is a security mechanism enforced by browsers that controls whether web pages on one domain can access resources hosted on a different domain.

---

## 1. Prerequisites & Conceptual Basics

### Same-Origin Policy (SOP)
Browsers implement a foundational security mechanism called the **Same-Origin Policy**. An "Origin" is defined by three components:
**Scheme (Protocol) + Host (Domain) + Port**

If any of these three components differ, the request is considered "Cross-Origin". Under SOP:
- Web pages can embed cross-origin resources like images, stylesheets, or scripts using HTML tags (`<img>`, `<link>`, `<script>`).
- However, scripts (like `fetch` or `Axios` AJAX requests) **cannot** read raw responses from cross-origin APIs unless the target server explicitly permits it.

### Preflight Requests (OPTIONS)
For "non-simple" requests (e.g. sending JSON data, custom headers like `Authorization`, or using PUT/DELETE methods), browsers automatically send a quick check request using the **`OPTIONS`** method first. This is called a **preflight request**. The server must respond with appropriate access control headers before the browser executes the actual request.

---

## 2. Theory & Deep Dive

### CORS Configuration Properties
- **origin**: Defines which domains are allowed. Can be a string, array, regex, or a dynamic validator function.
- **credentials**: A boolean value. Must be set to `true` if client requests need to share cookies or authorization headers.
- **exposedHeaders**: Lists headers that the client browser is permitted to read from the server response.

---

## 3. Code Implementation

Here is how you set up CORS configuration rules using the `cors` package:

```javascript
const express = require("express");
const cors = require("cors");
const app = express();

const PORT = 3000;

// Option 1: Allow ALL origins (Not recommended for secure production APIs)
// app.use(cors());

// Option 2: Configured CORS for specific origins (Best Practice)
const corsOptions = {
  origin: ["http://localhost:5173", "https://my-trusted-frontend.com"], // Whitelisted client domains
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP actions
  allowedHeaders: ["Content-Type", "Authorization"], // Allowed request headers
  credentials: true, // Allow cookies and authorization headers (essential for JWT/sessions)
  optionsSuccessStatus: 200 // Response status for preflight requests
};

// Apply configured CORS rules globally
app.use(cors(corsOptions));

app.use(express.json());

// Sample endpoint
app.get("/api/data", (req, res) => {
  res.json({
    message: "This response has CORS headers. Accessible by white-listed clients!",
    secureData: [102, 204, 306]
  });
});
```

---

## 4. Self-Contained Mini-Project: Multi-Origin API Service

We will build a backend API that selectively permits connections from a client running on a specific port, while rejecting other origins.

### Project Setup
```text
express-cors-demo/
├── server.js
└── package.json (requires: express, cors)
```

### File: `server.js`
```javascript
const express = require("express");
const cors = require("cors");
const app = express();

// Whitelist only localhost:8080. Localhost:9090 will be blocked by the browser.
const whitelist = ["http://localhost:8080"];

const corsOptions = {
  origin: function (origin, callback) {
    // If request has no origin (like mobile apps, curl, or Postman), or is in the whitelist:
    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS Blocked: Access from this Origin is unauthorized."));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/api/secure-data", (req, res) => {
  res.json({
    status: "Success",
    data: "This secret data is only visible on authorized frontend client ports!"
  });
});

// Centralized error boundary to capture CORS errors gracefully
app.use((err, req, res, next) => {
  if (err.message.includes("CORS Blocked")) {
    return res.status(403).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(3000, () => console.log("CORS API server running on http://localhost:3000"));
```

---

## 5. Advanced Production Practices & Security

### The Wildcard and Credentials Conflict
In production, setting `origin: "*"` (allow all) and `credentials: true` (allow cookies) **simultaneously** is restricted. Browsers will automatically block the request to protect user sessions. If you need credentials, you must explicitly specify the allowed origin domains.

### Preflight Cache Optimization
Preflight requests (`OPTIONS`) double the latency of your API calls. Optimize this by caching preflight verification responses using the `maxAge` option (configured in seconds):
```javascript
const corsOptions = {
  origin: "https://myfrontend.com",
  maxAge: 86400 // Cache preflight response for 24 hours
};
```

---

## 6. Key Takeaways
1. Always apply CORS middlewares **before** declaring your routing endpoints.
2. If your frontend app needs to send cookies, you must set `credentials: true` in your CORS options, and the frontend Axios/Fetch requests must set `withCredentials: true`.
3. Never use wildcard `origin: "*"` combined with `credentials: true`. Browsers will block these requests for safety.
