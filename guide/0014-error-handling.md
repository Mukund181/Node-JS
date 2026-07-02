# Express.js Error Handling Middleware

Error handling in Express refers to catching and processing synchronous and asynchronous errors that occur during route execution, preventing server crashes and returning clean responses.

---

## 1. Prerequisites & Conceptual Basics

### Call Stack Exceptions
When a program encounters an error (like trying to access properties of `null`), it throws an exception. If your code does not catch this exception, it bubbles up through the call stack until it reaches the Node.js runtime process. For safety, the runtime terminates the process, causing the server to crash.

In Express:
- **Synchronous errors** (e.g. JSON syntax errors in request bodies) are caught by Express's internal try-catch wrapper automatically and routed to the default error handler.
- **Asynchronous errors** (e.g. database query timeouts, failed API requests) are **not** caught automatically by Express 4. If they are not handled, the process crashes, or leaves dangling connections (unhandled promise rejections).

---

## 2. Theory & Deep Dive

### Express Error Middleware Signature
Standard Express middleware uses three parameters: `(req, res, next)`.
Express identifies error-handling middleware by its specific signature of **exactly four parameters**:
```javascript
app.use((err, req, res, next) => { ... });
```
Even if you do not use the `next` parameter, you must list it in the function signature. Otherwise, Express will treat it as a standard middleware, causing the request to hang.

---

## 3. Basic Code Implementation

Here is how you set up dynamic error handlers and write async wrappers:

```javascript
const express = require("express");
const app = express();

const PORT = 3000;

app.use(express.json());

// 1. Helper Wrapper for Asynchronous Routes (Avoids repetitive try-catch blocks)
function asyncHandler(fn) {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next); // Passes async errors straight to Express error middleware
  };
}

// Route producing a synchronous error
app.get("/sync-error", (req, res, next) => {
  try {
    throw new Error("Synchronous database connection error");
  } catch (err) {
    next(err); // Pass error to the global error middleware handler
  }
});

// Route producing an asynchronous error using asyncHandler wrapper
app.get("/async-error", asyncHandler(async (req, res) => {
  const fakeDbCall = await Promise.reject(new Error("Database query timed out"));
  res.json(fakeDbCall);
}));

// 2. Global Centralized Error Handling Middleware
app.use((err, req, res, next) => {
  console.error("Centralized Logger -> Error Message:", err.message);

  const statusCode = err.status || 500;
  
  res.status(statusCode).json({
    success: false,
    message: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined
  });
});
```

---

## 4. Self-Contained Mini-Project: Secure API Gateway with Custom Error Handling

We will build an API gateway that validates client API keys. If validation fails, it throws a custom error that is formatted and returned as JSON by the centralized error handler.

### Project Setup
```text
express-error-gateway/
├── server.js
└── package.json (requires: express)
```

### File: `server.js`
```javascript
const express = require("express");
const app = express();

// Custom Class representing unauthorized access exceptions
class APIError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

// Middleware validating api keys
function validateApiKey(req, res, next) {
  const apiKey = req.query.key;
  if (!apiKey) {
    throw new APIError("Authentication Failed: API key is missing.", 401);
  }
  if (apiKey !== "secret123") {
    throw new APIError("Access Denied: Invalid API key.", 403);
  }
  next();
}

app.get("/api/dashboard", validateApiKey, (req, res) => {
  res.status(200).json({ success: true, secrets: ["Data Entry A", "Data Entry B"] });
});

// Simulate async resource not found error
app.get("/api/user/:id", (req, res, next) => {
  setTimeout(() => {
    try {
      const userId = req.params.id;
      if (userId !== "1") {
        throw new APIError(`User with ID ${userId} not found in database.`, 404);
      }
      res.json({ id: 1, name: "Mukund" });
    } catch (err) {
      next(err); // Route async errors to Express
    }
  }, 100);
});

// Centralized Error Middleware
app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const message = err.message || "Unexpected Server Error";

  console.error(`[ERROR LOG] Status: ${status} | Message: ${message}`);

  res.status(status).json({
    success: false,
    status: status,
    error: message,
    timestamp: new Date().toISOString()
  });
});

app.listen(3000, () => console.log("Secure gateway active at http://localhost:3000/api/dashboard"));
```

---

## 5. Advanced Production Practices & Security

### Process-Level Error Boundaries
Some errors occur outside the scope of Express request-response handlers (e.g. database connection drops during startup).
To prevent these from crashing your application without logs, configure process-level event listeners in your main entry file (e.g. `server.js`):
```javascript
// Catch synchronous programming syntax crashes
process.on("uncaughtException", (error) => {
  console.error("CRITICAL CRASH: Uncaught Exception:", error);
  // Perform necessary cleanups (e.g. close database connections)
  process.exit(1); // Exit process
});

// Catch unhandled database promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});
```

---

## 6. Key Takeaways
1. The global error handler middleware must be placed at the **very bottom of the app configuration stack**, after all endpoints and standard route declarations.
2. The signature `(err, req, res, next)` is unique. Even if you don't call `next`, you must list it, or Express will mistake the function for a normal middleware.
3. In production, **never** send raw error objects or stack traces (`err.stack`) to client users, as this exposes directory structures, framework choices, and database configurations.
