# Form Handling in Express

Form handling involves receiving, parsing, validating, and responding to data sent by client HTML forms or REST API requests.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
When clients submit data (e.g. usernames, passwords) via HTTP requests:
1. The request payload travels inside the **Request Body** stream.
2. The request must include a **`Content-Type`** header specifying how the body data is formatted.
3. The server inspects this header to determine how to parse the incoming byte stream:
   - **`application/x-www-form-urlencoded`**: Standard HTML form submission format. Keys and values are joined with `=` and separated by `&` (e.g. `username=student&email=test%40test.com`).
   - **`application/json`**: Modern JSON object format (e.g. `{"username": "student", "email": "test@test.com"}`).

By default, Node.js sees this body payload as a raw byte stream. Express requires body-parsing middleware to convert this stream into a structured JavaScript object.

---

## 2. Theory & Deep Dive

### Parsing Pipeline
When parsing requests:
- `express.urlencoded({ extended: true })` parses urlencoded form bodies. Setting `extended: true` allows parsing nested objects using the `qs` library.
- `express.json()` parses incoming JSON payloads.

These middleware functions read the incoming body stream, parse the keys and values, and expose them as a JavaScript object on **`req.body`**.

---

## 3. Code Implementation

Here is an end-to-end form parser setup matching CommonJS practices:

```javascript
const express = require("express");
const path = require("path");
const app = express();

const PORT = 3000;

// Middleware 1: Parsers for standard HTML forms (URL encoded)
app.use(express.urlencoded({ extended: true }));

// Middleware 2: Parsers for modern JSON client requests
app.use(express.json());

// Serving index form
app.get("/register", (req, res) => {
  res.send(`
    <h2>Registration Form</h2>
    <form action="/register" method="POST">
      <label>Username:</label><br>
      <input type="text" name="username" required><br><br>
      <label>Email:</label><br>
      <input type="email" name="email" required><br><br>
      <button type="submit">Submit Details</button>
    </form>
  `);
});

// Handle form submission via POST
app.post("/register", (req, res) => {
  const { username, email } = req.body;

  // Simple backend validation
  if (!username || !email) {
    return res.status(400).send("Validation Failed: Fields cannot be blank.");
  }

  console.log(`Saved User -> Name: ${username}, Email: ${email}`);
  
  res.status(200).send(`
    <h3>Registration Successful!</h3>
    <p>Welcome, ${username}. We received your form payload.</p>
    <a href="/register">Go Back</a>
  `);
});
```

---

## 4. Self-Contained Mini-Project: Contact Registration System

We will build a server that handles contact form submissions. It validates the input length on the backend and accepts both standard HTML forms and JSON AJAX submissions.

### Project Setup
```text
express-form-contacts/
├── server.js
└── package.json (requires: express)
```

### File: `server.js`
```javascript
const express = require("express");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/contact", (req, res) => {
  res.send(`
    <h3>Contact Registration</h3>
    <form id="contactForm" action="/contact" method="POST">
      <input type="text" name="name" placeholder="Contact Name" required><br><br>
      <input type="text" name="phone" placeholder="Phone Number" required><br><br>
      <button type="submit">Submit (HTML Form)</button>
    </form>
  `);
});

// Route handling both Form-urlencoded and JSON submits
app.post("/contact", (req, res) => {
  const { name, phone } = req.body;

  // Validation
  if (!name || name.trim().length < 3) {
    return res.status(400).json({ success: false, error: "Name must be at least 3 characters long." });
  }
  if (!phone || phone.trim().length < 8) {
    return res.status(400).json({ success: false, error: "Phone must be at least 8 digits long." });
  }

  // Check client expectations: JSON response vs HTML page response
  if (req.headers["accept"] && req.headers["accept"].includes("application/json")) {
    return res.status(200).json({
      success: true,
      message: "Contact saved successfully (via JSON API).",
      contact: { name, phone }
    });
  }

  res.send(`
    <h3>Contact Saved!</h3>
    <p>Name: ${name} | Phone: ${phone}</p>
    <a href="/contact">Add another</a>
  `);
});

app.listen(3000, () => console.log("Contacts parser running at http://localhost:3000/contact"));
```

---

## 5. Advanced Production Practices & Security

### Payload Size Limits
By default, Express body-parsers do not limit the size of incoming request bodies. A malicious user can send a massive 50MB JSON string to your endpoint. The parser will attempt to load this huge payload into memory, causing the event loop to block and potentially crashing the server.
- **Solution**: Set size limits inside your body-parser configurations in production:
  ```javascript
  app.use(express.json({ limit: "10kb" })); // Reject JSON payloads larger than 10KB
  app.use(express.urlencoded({ limit: "10kb", extended: true }));
  ```

### Cross-Site Scripting (XSS) Sanitization
When accepting user inputs, always sanitize them before saving them to the database or rendering them back to other users. You can use packages like `dompurify` or `validator` to strip HTML tags from input strings.

---

## 6. Key Takeaways
1. Configured parser middlewares (`express.urlencoded` and `express.json`) populate **`req.body`**. If you attempt to access `req.body` without them, it resolves to `undefined`.
2. Set `extended: true` in `urlencoded` to enable parsing nested objects using the `qs` library.
3. For multi-part file uploads (images, files), standard URL parser middlewares do not work; you must use dedicated libraries like **Multer** (see `021-multer.md`).
