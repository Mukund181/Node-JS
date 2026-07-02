# Sending Emails using Nodemailer

Nodemailer is a module for Node.js applications that allows you to send emails easily using SMTP or built-in service configurations.

---

## 1. Prerequisites & Conceptual Basics

### SMTP Protocol
SMTP (Simple Mail Transfer Protocol) is the standard application-layer protocol used to transmit email across IP networks.
When sending email from your application:
- Your Node.js app acts as an SMTP client.
- It opens a socket connection to an SMTP server (e.g. `smtp.gmail.com` on port `587`).
- It authenticates using your account credentials.
- It sends the recipient's address and the email message payload.
- The SMTP server routes the email to the recipient's mail server.

---

## 2. Theory & Deep Dive

### SMTP Encryption Ports
- **Port 587 (Recommended)**: Uses **STARTTLS** encryption. The connection starts unencrypted and is upgraded to secure TLS automatically before authentication.
- **Port 465**: Uses **SMTPS** (SMTP over SSL) encryption from the start.

To protect your email account's security, never use your main login password in code. If you are using Gmail, you must generate an **App Password** from your Google account settings.

---

## 3. Code Implementation

First, install the library: `npm install nodemailer dotenv`

Configure variables in `.env`:
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_username@gmail.com
EMAIL_PASS=your_app_password
```

### Server Code Implementation

```javascript
const express = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(express.json());

// 1. Configure the SMTP transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false, // Set true for SSL (port 465), false for TLS (port 587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Verify connection configuration states
transporter.verify((error, success) => {
  if (error) {
    console.error("Transporter SMTP error:", error.message);
  } else {
    console.log("Transporter ready to deliver messages!");
  }
});
```

---

## 4. Self-Contained Mini-Project: One-Time Password (OTP) Email Service

We will build an Express application that generates a random 6-digit verification code, emails it to a user, and validates the code they enter on a confirmation page.

### Project Setup
```text
express-nodemailer-otp/
├── server.js
└── package.json (requires: express, nodemailer, dotenv)
```

### File: `server.js`
```javascript
const express = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.mailtrap.io",
  port: process.env.EMAIL_PORT || 2525,
  auth: {
    user: process.env.EMAIL_USER || "mock_user",
    pass: process.env.EMAIL_PASS || "mock_pass"
  }
});

// In-memory OTP storage
let activeOtps = {};

app.get("/verify", (req, res) => {
  res.send(`
    <h3>Request OTP</h3>
    <form action="/verify/request" method="POST">
      <input type="email" name="email" placeholder="Enter email" required><br><br>
      <button type="submit">Send Code</button>
    </form>
    <hr>
    <h3>Submit OTP</h3>
    <form action="/verify/submit" method="POST">
      <input type="email" name="email" placeholder="Enter email" required><br>
      <input type="text" name="otp" placeholder="6-digit Code" required><br><br>
      <button type="submit">Verify Code</button>
    </form>
  `);
});

// 1. Generate and Email OTP
app.post("/verify/request", async (req, res) => {
  const { email } = req.body;
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit random code

  // Save OTP in memory with a 5-minute expiration window
  activeOtps[email] = {
    code: otpCode,
    expiresAt: Date.now() + 5 * 60 * 1000
  };

  const mailOptions = {
    from: `"Verification Hub" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Account Verification Code",
    html: `<h3>Your Verification Code is: <b>${otpCode}</b></h3><p>This code expires in 5 minutes.</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send(`<h3>Verification code sent to ${email}</h3><a href="/verify">Back</a>`);
  } catch (err) {
    res.status(500).send(`Error sending email: ${err.message}`);
  }
});

// 2. Validate OTP
app.post("/verify/submit", (req, res) => {
  const { email, otp } = req.body;
  const record = activeOtps[email];

  if (!record) {
    return res.status(400).send("No verification codes requested for this email.");
  }

  if (Date.now() > record.expiresAt) {
    delete activeOtps[email];
    return res.status(400).send("Verification code has expired.");
  }

  if (record.code === otp.trim()) {
    delete activeOtps[email];
    res.send("<h3>Verification Successful!</h3>");
  } else {
    res.status(400).send("Invalid verification code. Please try again.");
  }
});

app.listen(3000, () => console.log("OTP email service active at http://localhost:3000/verify"));
```

---

## 5. Advanced Production Practices & Security

### Avoiding Blocked Event Loops (Message Queues)
Sending an email is a slow operation that can take up to 2-3 seconds. If your route handler waits for `transporter.sendMail` to finish before returning a response, it blocks the user and slows down your application.
- **Production Solution**: Do not send emails synchronously in request handlers. Instead, write email requests to a message queue (like **BullMQ** using **Redis**) and let a background worker process send the emails asynchronously.

### HTML Email Styling Template Engines
Writing complex inline HTML styles directly in JavaScript string variables is difficult to maintain.
- **Solution**: Use template engines like **Handlebars** or **EJS** to compile dynamic HTML email templates before sending them.

---

## 6. Key Takeaways
1. **Never store real password strings.** If using Gmail, you must generate an **App Password** from your Google account settings under 2-step verification. Standard passwords will be blocked by Google security.
2. For testing emails during development without sending actual emails to users, use mock SMTP services like **Mailtrap** or **Ethereal Email** to safely capture outgoing messages.
3. Provide both plain-text (`text`) and styled (`html`) bodies to ensure compatibility with client email readers that disable HTML formatting.
