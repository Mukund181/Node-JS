# Cookie-Parser Middleware

The `cookie-parser` middleware is used to parse cookie headers from incoming HTTP client requests and populate `req.cookies` with an object keyed by cookie names.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
A cookie is a small key-value text pair (limited to ~4KB) managed by the browser:
1. When processing a request, the server can send a header:
   `Set-Cookie: user_theme=dark; Max-Age=3600; HttpOnly`
2. The browser intercepts this header and stores the cookie locally on the client's machine.
3. For every subsequent request to that same domain, the browser automatically appends all matching stored cookies inside the request header:
   `Cookie: user_theme=dark`
4. The server reads this header string, parses the variables, and adapts the response accordingly.

---

## 2. Theory & Deep Dive

### Cookie Signing vs Encryption
- **Unsigned Cookies**: Stored in plain text. The client can easily edit the cookie values in browser Developer Tools.
- **Signed Cookies**: The server appends a cryptographic hash signature using a private secret key. If a user modifies the cookie value in their browser, the signature hash checks will fail.
- **Encryption**: Encryption hides the cookie contents completely. Signing simply **verifies authenticity** while keeping the text contents visible.

---

## 3. Code Implementation

Here is an example setup using `cookie-parser`:

```javascript
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();

const PORT = 3000;

// Initialize cookie-parser middleware. 
// You can pass a string secret to sign and secure cookies from tampering.
app.use(cookieParser("my-cookie-signing-secret"));

// 1. Setting Cookies
app.get("/set-cookie", (req, res) => {
  // Set a basic unsigned cookie
  res.cookie("theme", "dark", { maxAge: 900000, httpOnly: true });

  // Set a signed secure cookie
  res.cookie("userSession", "session_value_here", {
    maxAge: 900000,
    httpOnly: true, // Prevents client-side scripts from reading cookie (XSS protection)
    signed: true // Sign with the secret configured above
  });

  res.send("Cookies have been set! Check your DevTools Application tab.");
});

// 2. Reading Cookies
app.get("/read-cookie", (req, res) => {
  // Access basic cookies
  const theme = req.cookies.theme;

  // Access signed cookies (helps verify if the client modified them)
  const session = req.signedCookies.userSession;

  res.json({
    unsignedCookies: req.cookies,
    signedCookies: req.signedCookies,
    extractedTheme: theme,
    extractedSession: session
  });
});
```

---

## 4. Self-Contained Mini-Project: User Preference Manager

We will build a simple customization dashboard where users save layout preferences (e.g. font size, layout layout-theme) that are parsed and preserved using signed cookies.

### Project Setup
```text
express-cookie-preferences/
├── server.js
└── package.json (requires: express, cookie-parser)
```

### File: `server.js`
```javascript
const express = require("express");
const cookieParser = require("cookie-parser");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(cookieParser("preference-signing-secret-key-99"));

app.get("/settings", (req, res) => {
  // Access signed configuration preferences. Defaults if empty.
  const layoutTheme = req.signedCookies.theme || "light";
  const fontSize = req.signedCookies.fontSize || "16px";

  const isDarkMode = layoutTheme === "dark";
  const bodyBg = isDarkMode ? "#121212" : "#ffffff";
  const bodyColor = isDarkMode ? "#ffffff" : "#000000";

  res.send(`
    <body style="background: ${bodyBg}; color: ${bodyColor}; font-size: ${fontSize}; font-family: sans-serif;">
      <h2>User Settings Dashboard</h2>
      <p>Current Theme: <b>${layoutTheme}</b></p>
      <p>Current Font Size: <b>${fontSize}</b></p>
      <hr>
      <form action="/settings/save" method="POST">
        <label>Select Theme:</label><br>
        <input type="radio" name="theme" value="light" ${!isDarkMode ? "checked" : ""}> Light<br>
        <input type="radio" name="theme" value="dark" ${isDarkMode ? "checked" : ""}> Dark<br><br>

        <label>Select Font Size:</label><br>
        <select name="fontSize">
          <option value="14px" ${fontSize === "14px" ? "selected" : ""}>Small (14px)</option>
          <option value="18px" ${fontSize === "18px" ? "selected" : ""}>Medium (18px)</option>
          <option value="24px" ${fontSize === "24px" ? "selected" : ""}>Large (24px)</option>
        </select><br><br>

        <button type="submit">Save Preferences</button>
      </form>
    </body>
  `);
});

app.post("/settings/save", (req, res) => {
  const { theme, fontSize } = req.body;

  const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    signed: true
  };

  res.cookie("theme", theme, cookieOptions);
  res.cookie("fontSize", fontSize, cookieOptions);
  res.redirect("/settings");
});

app.listen(3000, () => console.log("Preference app active at http://localhost:3000/settings"));
```

---

## 5. Advanced Production Practices & Security

### Cookie Security Attributes
- **HttpOnly**: Stops client-side JavaScript from accessing cookies (using `document.cookie`). This mitigates session hijacking through XSS vulnerabilities.
- **Secure**: Forces browsers to transmit the cookie only over secure HTTPS connections.
- **SameSite**: 
  - `Strict`: Never sends the cookie on cross-site requests (e.g. clicking a link from an external site).
  - `Lax`: Default. Sends cookies for top-level navigations (clicking standard links).
  - `None`: Sends cookies on all cross-site requests, but requires `Secure` to be true.

---

## 6. Key Takeaways
1. Basic cookies stored in `req.cookies` can be read and edited by client JavaScript unless `httpOnly: true` is configured.
2. Signed cookies stored in `req.signedCookies` are verified using the cookie secret. If the client attempts to modify the cookie value, it fails signature verification and evaluates to `false`.
3. Set option `secure: true` when deploying to production so the cookie will only be transmitted via secure HTTPS connections.
