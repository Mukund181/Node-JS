# Connect-Flash Middleware

The `connect-flash` middleware is a library used to store temporary values in sessions, which are cleared immediately after being read. These are typically called "flash messages."

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
When validation fails during a form submission on the route `/submit`, standard practice is to redirect the user back to the `/form` page. However, because redirects trigger a new HTTP request from the browser, all request-specific variables (like error messages or input values) are lost.

To solve this, we can store these error messages in the user's session. However, if we store them in a standard session variable, the message will persist and keep displaying on subsequent page visits unless we write manual cleanup code.
`connect-flash` solves this by automating the cleanup process:
- You save a message to the session: `req.flash('info', 'Saved')`.
- On the next request, you read it: `req.flash('info')`.
- The middleware **automatically deletes** the message from the session immediately after it is read.

---

## 2. Theory & Deep Dive

### Session Dependency
`connect-flash` is not a standalone storage module. It stores messages inside `req.session.flash`. Therefore, it **requires** session middleware (like `express-session`) to be initialized first in the Express application stack.

---

## 3. Code Implementation

Make sure to install `express-session` and `connect-flash` before running this implementation.

```javascript
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const app = express();

const PORT = 3000;

// Sessions are REQUIRED for connect-flash to store messages
app.use(
  session({
    secret: "flash-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60000 }
  })
);

// Initialize flash middleware
app.use(flash());

// Route trigger: Redirecting and sending flash message
app.get("/trigger-success", (req, res) => {
  // Store a flash message under the "success" category
  req.flash("success", "Profile updated successfully!");
  res.redirect("/display");
});

app.get("/trigger-error", (req, res) => {
  // Store a flash message under the "error" category
  req.flash("error", "Database operation failed. Please try again.");
  res.redirect("/display");
});

// Destination Route: Reads and displays the message
app.get("/display", (req, res) => {
  // Fetch messages from flash storage. Reading them clears them from the session automatically.
  const successMsg = req.flash("success");
  const errorMsg = req.flash("error");

  res.send(`
    <h2>Notification Page</h2>
    ${successMsg.length > 0 ? `<div style="color: green;"><b>Success:</b> ${successMsg}</div>` : ""}
    ${errorMsg.length > 0 ? `<div style="color: red;"><b>Error:</b> ${errorMsg}</div>` : ""}
    <br>
    <a href="/trigger-success">Trigger Success Redirect</a> | 
    <a href="/trigger-error">Trigger Error Redirect</a>
  `);
});
```

---

## 4. Self-Contained Mini-Project: Form Validation with Redirected Flash States

We will build an application where a user submits feedback. If validation fails (e.g. name too short), the user is redirected back and the validation errors are displayed.

### Project Setup
```text
express-flash-validation/
├── server.js
└── package.json (requires: express, express-session, connect-flash)
```

### File: `server.js`
```javascript
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");
const app = express();

app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "secret-validation-flash-key",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60000 }
}));

app.use(flash());

app.get("/feedback", (req, res) => {
  // Retrieve flashed values (if any exist)
  const errors = req.flash("errors");
  const success = req.flash("success");
  const oldInputName = req.flash("oldName")[0] || ""; // Flash variables are arrays

  let errorAlerts = errors.map(err => `<p style="color:red;">* ${err}</p>`).join("");
  let successAlert = success.length > 0 ? `<div style="padding:10px; background:#d4edda; color:#155724;">${success[0]}</div>` : "";

  res.send(`
    <h2>Submit Feedback</h2>
    ${successAlert}
    ${errorAlerts}
    <form action="/feedback/submit" method="POST">
      <label>Your Name (minimum 3 characters):</label><br>
      <input type="text" name="name" value="${oldInputName}"><br><br>
      <label>Feedback Message:</label><br>
      <textarea name="message"></textarea><br><br>
      <button type="submit">Submit</button>
    </form>
  `);
});

app.post("/feedback/submit", (req, res) => {
  const { name, message } = req.body;
  const errors = [];

  // Simple validations
  if (!name || name.length < 3) {
    errors.push("Name must be at least 3 characters long.");
  }
  if (!message || message.trim().length === 0) {
    errors.push("Feedback message cannot be empty.");
  }

  if (errors.length > 0) {
    // Save validation feedback errors and inputs to flash
    req.flash("errors", errors);
    req.flash("oldName", name);
    return res.redirect("/feedback");
  }

  // Success path
  req.flash("success", "Thank you! Your feedback has been recorded.");
  res.redirect("/feedback");
});

app.listen(3000, () => console.log("Feedback app running at http://localhost:3000/feedback"));
```

---

## 5. Advanced Production Practices & Security

### Race Conditions in API and AJAX requests
If a user triggers multiple parallel AJAX requests, they can cause a race condition. Since flash messages are cleared on read, one request might read and clear the session data before other concurrent requests can access it.
- **Solution**: Avoid using `connect-flash` for stateless REST APIs. For APIs, return validation errors directly in the JSON response payload (`res.status(400).json({ errors })`) instead of using redirects.

### Session Cleanups
If flash messages are written to the database (e.g. via MongoStore) but never read, the database will collect orphan session records. Always configure clean, short session TTLs (Time-To-Live).

---

## 6. Key Takeaways
1. `connect-flash` relies entirely on a configured **session middleware**. It will fail if placed before `app.use(session(...))`.
2. Calling `req.flash(key)` returns an array of messages matching that key and deletes them from the session. A subsequent call to `req.flash(key)` during the same or next request will return empty arrays.
3. You can define dynamic categories of messages (e.g., `info`, `success`, `error`, `warning`).
