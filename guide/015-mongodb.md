# MongoDB and Mongoose Connection Setup

Mongoose is an Object Data Modeling (ODM) library for MongoDB and Node.js. It manages relationships between data, provides schema validation, and translates between objects in code and database documents.

---

## 1. Prerequisites & Conceptual Basics

### SQL vs NoSQL
- **SQL (e.g. MySQL, PostgreSQL)**: Stores data in rigid, tabular rows and columns. Relationships are enforced through foreign keys and join tables.
- **NoSQL (e.g. MongoDB)**: Stores data in flexible, JSON-like binary documents (BSON). Data structures can vary between documents in the same collection.

### What is Mongoose?
While MongoDB's flexibility is powerful, it can lead to data inconsistency. Mongoose acts as a schema-validation layer on top of MongoDB. It allows you to define the structure of your data in code (Schemas), compile these schemas into models, and execute queries safely.

---

## 2. Theory & Deep Dive

### Connection URI Components
A standard MongoDB connection string follows this format:
`mongodb://[username:password@]host1[:port1][/[database]`
- **`127.0.0.1`**: Resolves to localhost.
- **`27017`**: Default port for MongoDB.

Keep your server logic separate from your database connection configuration to make testing easier and keep code clean.

---

## 3. Code Implementation

Make sure to install `mongoose` and `dotenv` first: `npm install mongoose dotenv`

### File: `config/db.js` (Database Config)
```javascript
const mongoose = require("mongoose");

// Load environmental variables
require("dotenv").config();

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/my_app_db";

async function connectDB() {
  try {
    // Establish connection to MongoDB
    const connectionInstance = await mongoose.connect(MONGO_URI);
    
    console.log(`\nMongoDB Connected Successfully! Host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("Database connection failure:", error.message);
    process.exit(1);
  }
}

// Monitor database connection states
mongoose.connection.on("disconnected", () => {
  console.warn("Mongoose connection disconnected.");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error occurred:", err.message);
});

module.exports = connectDB;
```

---

## 4. Self-Contained Mini-Project: Database Connectivity Monitor

We will build an Express application that monitors and exposes the status of our MongoDB connection (e.g. `disconnected`, `connected`, `connecting`, `disconnecting`).

### Project Setup
```text
express-mongo-monitor/
├── config/
│   └── db.js
├── server.js
└── package.json (requires: express, mongoose, dotenv)
```

### File: `server.js`
```javascript
const express = require("express");
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const app = express();

connectDB();

app.get("/api/db-status", (req, res) => {
  // mongoose.connection.readyState returns connection code integers
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const statesMap = {
    0: "Disconnected",
    1: "Connected",
    2: "Connecting",
    3: "Disconnecting"
  };

  const code = mongoose.connection.readyState;
  const statusString = statesMap[code] || "Unknown";

  res.status(200).json({
    success: true,
    dbConnectionState: code,
    status: statusString,
    host: mongoose.connection.host || "none",
    dbName: mongoose.connection.name || "none"
  });
});

app.listen(3000, () => {
  console.log("Database status monitor running on http://localhost:3000/api/db-status");
});
```

---

## 5. Advanced Production Practices & Security

### Connection Pool Configuration
In production, setting up database connections for every request causes high latency. Instead, use a **Connection Pool** to share database connections across requests. You can configure the pool size inside the Mongoose connection options:
```javascript
const options = {
  maxPoolSize: 10, // Maintain up to 10 socket connections in parallel
  serverSelectionTimeoutMS: 5000, // Timeout after 5 seconds
  socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
};

await mongoose.connect(MONGO_URI, options);
```

### Secure Storage
Never save production database passwords directly in your codebase. If your credentials are leaked to GitHub, attackers can compromise your database. Always load connection strings dynamically from system environment variables (`process.env.MONGO_URI`).

---

## 6. Key Takeaways
1. Never hardcode connection strings. Store credentials like username, password, and hosts inside `.env` files.
2. MongoDB connections are **asynchronous**. Ensure connection functions are fully resolved before starting server route traffic.
3. Catch initial database connection errors using `try-catch` blocks, and monitor subsequent connection crashes with event listeners like `mongoose.connection.on("error")`.
