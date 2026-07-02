# Express.js Basics

Express is a minimal and flexible Node.js web application framework that provides a robust set of features for web and mobile applications. It simplifies route management, middleware execution, and HTTP request/response handling.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
Express acts as a layer on top of Node's native HTTP module. Its core philosophy revolves around two primary concepts:
1. **Routing**: Defining endpoints based on URL paths and HTTP verbs (GET, POST, etc.) to run specific handler code blocks.
2. **Middleware**: A pipeline pattern. When a request arrives, it flows through a sequential chain of functions. Each function can inspect the request, modify it, send a response, or call the next middleware in line (`next()`).

### Visualizing the Pipeline
```text
Client Request  ===> [Middleware 1 (JSON parser)] ===> [Middleware 2 (Logger)] ===> [Route Handler (POST /login)] ===> Server Response
```

---

## 2. Theory & Deep Dive

### Express Routing Lifecycle
Every route handler in Express receives three arguments:
- `req`: The Request object containing parameters, query parameters, headers, and the body.
- `res`: The Response object used to build headers and send data back to the client.
- `next`: A function that, when executed, passes control to the next middleware handler in the stack.

---

## 3. Basic Code Implementation

Below is a standard Express project startup:

```javascript
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

// Enable JSON middleware to parse incoming application/json body requests
app.use(express.json());

// 1. Basic GET Route
app.get("/", (req, res) => {
  res.status(200).send("Welcome to Express.js!");
});

// 2. Route with query parameters (e.g. /search?term=node)
app.get("/search", (req, res) => {
  const searchTerm = req.query.term || "nothing";
  res.json({
    msg: `You searched for: ${searchTerm}`,
  });
});

// 3. POST Route accepting JSON data
app.post("/users", (req, res) => {
  const newUser = req.body; // parsed automatically by express.json()
  
  if (!newUser.name) {
    return res.status(400).json({ error: "Name field is required" });
  }

  // Simulating user creation response
  res.status(201).json({
    message: "User registered successfully",
    user: newUser
  });
});
```

---

## 4. Self-Contained Mini-Project: Todo REST API

We will build a fully functional in-memory Todo tracking REST API.

### Project Setup
Create folder structure:
```text
express-todo-api/
├── server.js
└── package.json (requires: express)
```

### File: `server.js`
```javascript
const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory Database
let todos = [
  { id: 1, task: "Learn Node.js basics", completed: true },
  { id: 2, task: "Build a native HTTP server", completed: false }
];

// GET: Read all todos
app.get("/api/todos", (req, res) => {
  res.status(200).json({ success: true, count: todos.length, data: todos });
});

// POST: Create a new todo
app.post("/api/todos", (req, res) => {
  const { task } = req.body;

  if (!task) {
    return res.status(400).json({ success: false, message: "Task field is required" });
  }

  const newTodo = {
    id: todos.length > 0 ? todos[todos.length - 1].id + 1 : 1,
    task: task,
    completed: false
  };

  todos.push(newTodo);
  res.status(201).json({ success: true, data: newTodo });
});

// DELETE: Remove a todo by ID
app.delete("/api/todos/:id", (req, res) => {
  const id = parseInt(req.params.id, 10);
  const todoIndex = todos.findIndex(t => t.id === id);

  if (todoIndex === -1) {
    return res.status(404).json({ success: false, message: "Todo item not found" });
  }

  todos.splice(todoIndex, 1);
  res.status(200).json({ success: true, message: `Todo with ID ${id} deleted.` });
});

app.listen(PORT, () => {
  console.log(`Todo REST API running on http://localhost:${PORT}`);
});
```

---

## 5. Advanced Production Practices & Security

### Security: Helmet Middleware
Express headers expose server details (e.g. `X-Powered-By: Express`), which hackers use to scan for target vulnerabilities.
- **Solution**: Install and use the **`helmet`** middleware to set safe HTTP headers dynamically and hide framework markers.
  ```javascript
  const helmet = require("helmet");
  app.use(helmet());
  ```

### Handling Reverse Proxies (NGINX)
If your Node.js application is running behind a proxy like NGINX, client IP addresses will register as `127.0.0.1`. Configure:
```javascript
app.set("trust proxy", 1);
```
This enables Express to read the `X-Forwarded-For` header correctly.

---

## 6. Key Takeaways
1. Express abstracts header setting, content-type checks, and stream endings. Calling `res.send()` or `res.json()` handles the execution end automatically.
2. Ensure you invoke `app.use(express.json())` at the top of your script if you need to read JSON request payloads via `req.body`.
3. Use the correct status code (e.g., `200` for OK, `201` for Created, `400` for Bad Request, `404` for Not Found, `500` for Internal Server Error) to convey response semantics properly.
