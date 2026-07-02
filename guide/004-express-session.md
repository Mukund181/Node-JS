# Express-Session Middleware

The `express-session` middleware is used to manage sessions in Express.js. Sessions allow servers to store user-specific data across multiple HTTP requests, solving the stateless nature of HTTP.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
HTTP is stateless. Each request sent to the server is treated as completely independent, with no memory of prior interactions.
To bridge this gap:
1. When a user first connects, the server initializes a unique session record in memory or a database and generates a unique **Session ID** (a long random string).
2. The server responds with a header setting a cookie containing this Session ID:
   `Set-Cookie: connect.sid=s%3AXXXXXX`
3. On every subsequent request, the client browser automatically transmits this session ID cookie back.
4. The server inspects the cookie, finds the corresponding session record, and exposes it in the request object (`req.session`).

---

## 2. Theory & Deep Dive

### Security Properties
- **secret**: A string used to sign the session ID cookie, protecting it from client-side tampering.
- **resave**: Forces the session to be saved back to the store, even if it wasn't modified during the request.
- **saveUninitialized**: Forces a session that is "uninitialized" (new but not modified) to be saved to the store. Setting this to `false` saves storage space.

---

## 3. Code Implementation

Here is a typical session implementation setup:

```javascript
const express = require("express");
const session = require("express-session");
const app = express();

const PORT = 3000;

// Configure session middleware
app.use(
  session({
    secret: "super-secret-key-do-not-share", // Key used to sign the session ID cookie
    resave: false, // Prevents saving session if it was not modified
    saveUninitialized: false, // Prevents saving uninitialized sessions
    cookie: {
      secure: false, // Set to true if using HTTPS
      maxAge: 1000 * 60 * 60 * 24 // Cookie lifetime in milliseconds (1 day)
    }
  })
);

// 1. Root route incrementing visitor counts inside session
app.get("/", (req, res) => {
  if (req.session.views) {
    req.session.views++;
  } else {
    req.session.views = 1;
  }
  res.send(`<h1>Views: ${req.session.views}</h1><p>Refresh page to increment.</p>`);
});

// 2. Set authentication route
app.get("/login", (req, res) => {
  req.session.userId = "user_123456";
  req.session.role = "admin";
  res.send("Logged in! Session updated.");
});

// 3. Protected route accessing session data
app.get("/dashboard", (req, res) => {
  if (!req.session.userId) {
    return res.status(401).send("Unauthorized: Please log in first.");
  }
  res.send(`Welcome User: ${req.session.userId} with role: ${req.session.role}`);
});

// 4. Logout route destroying session
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Could not log out.");
    }
    res.send("Session destroyed. Logged out!");
  });
});
```

---

## 4. Self-Contained Mini-Project: Multi-step Quiz Application

We will build a quiz system that tracks a user's answers across multiple questions and calculates a final score, storing progress inside the session.

### Project Setup
```text
express-quiz-session/
├── server.js
└── package.json (requires: express, express-session)
```

### File: `server.js`
```javascript
const express = require("express");
const session = require("express-session");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "quiz-secret-key-321",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 10 * 60 * 1000 } // 10 minutes timeout
}));

const questions = [
  { id: 0, q: "What is the default package manager for Node.js?", answers: ["pip", "npm", "composer"], correct: 1 },
  { id: 1, q: "Is Node.js single-threaded or multi-threaded?", answers: ["Single-threaded", "Multi-threaded"], correct: 0 },
  { id: 2, q: "Which core module is used to handle file paths?", answers: ["fs", "http", "path"], correct: 2 }
];

app.get("/quiz", (req, res) => {
  // Initialize quiz state in session if not present
  if (req.session.currentQuestion === undefined) {
    req.session.currentQuestion = 0;
    req.session.score = 0;
  }

  const index = req.session.currentQuestion;

  // Check if quiz is complete
  if (index >= questions.length) {
    const finalScore = req.session.score;
    // Clear session progress
    req.session.currentQuestion = undefined;
    req.session.score = undefined;
    return res.send(`<h2>Quiz Complete!</h2><p>Your Score: ${finalScore}/${questions.length}</p><a href="/quiz">Restart Quiz</a>`);
  }

  const question = questions[index];
  
  // Render form
  let formOptions = question.answers.map((ans, i) => 
    `<input type="radio" name="answer" value="${i}" id="a${i}"> <label for="a${i}">${ans}</label><br>`
  ).join("");

  res.send(`
    <h2>Question ${index + 1} of ${questions.length}</h2>
    <p><b>${question.q}</b></p>
    <form action="/quiz/submit" method="POST">
      ${formOptions}<br>
      <button type="submit">Submit Answer</button>
    </form>
  `);
});

app.post("/quiz/submit", (req, res) => {
  const index = req.session.currentQuestion;
  if (index === undefined || index >= questions.length) {
    return res.redirect("/quiz");
  }

  const userAnswer = parseInt(req.body.answer, 10);
  const correctAnswer = questions[index].correct;

  if (userAnswer === correctAnswer) {
    req.session.score = (req.session.score || 0) + 1;
  }

  // Move to next question
  req.session.currentQuestion++;
  res.redirect("/quiz");
});

app.listen(3000, () => console.log("Quiz server running on http://localhost:3000/quiz"));
```

---

## 5. Advanced Production Practices & Security

### Memory Leak Warn
By default, `express-session` stores sessions in memory (MemoryStore). When Node restarts, all sessions are lost. If you scale to multiple server instances, sessions fail because user requests are routed randomly across servers that don't share memory.
- **Production Solution**: Use external database stores like `connect-mongo` (saves sessions to MongoDB) or `connect-redis` (saves sessions to Redis).

### Secure Cookies Checklist
In production environments, ensure these properties are configured:
```javascript
cookie: {
  secure: true, // Requires HTTPS protocol
  httpOnly: true, // Prevents XSS scripts reading session ID cookies
  sameSite: 'lax' // Mitigates Cross-Site Request Forgery (CSRF)
}
```

---

## 6. Key Takeaways
1. By default, `express-session` stores sessions in memory. This is fine for development but leads to memory leaks in production. Use store modules like `connect-mongo` or `connect-redis` for production scaling.
2. The `secret` option must be a long random string in production, kept in environmental variables (`.env`).
3. Set `cookie.secure = true` in production environment to ensure session cookies are only transmitted over secure HTTPS connections.
