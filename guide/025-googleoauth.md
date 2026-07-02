# Google OAuth 2.0 Authentication

Google OAuth 2.0 allows users to log in to your web application using their Google accounts, eliminating the need to create new credentials.

---

## 1. Prerequisites & Conceptual Basics

### The OAuth 2.0 Delegation Protocol
OAuth 2.0 is an authorization framework that enables third-party applications to access user details without exposing passwords. It operates on a token-based delegation model:
1. The user clicks "Log in with Google" in your app.
2. The browser redirects the user to Google's consent screen.
3. The user approves the access request.
4. Google redirects the user back to your server with an **Authorization Code**.
5. Your server exchanges this code for an **Access Token** and a profile payload containing public details (name, email, avatar).

---

## 2. Theory & Deep Dive

### Passport.js Serialization Lifecycle
Passport.js uses a serialization process to maintain user sessions:
- **`serializeUser`**: Defines what user data to store in the session cookie (usually just the user ID).
- **`deserializeUser`**: Executed on every subsequent request. It reads the user ID from the session cookie, queries the database, and exposes the full user object on `req.user`.

---

## 3. Code Implementation

Install the dependencies first: `npm install passport passport-google-oauth20 express-session dotenv`

Configure variables in `.env`:
```env
GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
SESSION_SECRET=session_encryption_key
CALLBACK_URL=http://localhost:3000/auth/google/callback
```

### Server Code Integration

```javascript
const express = require("express");
const session = require("session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

const app = express();
const PORT = 3000;

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallback",
    resave: false,
    saveUninitialized: false
  })
);

app.use(passport.initialize());
app.use(passport.session());

// Configure Passport Google Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google Profile Info Received:", profile);
        
        const mockUser = {
          id: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value
        };

        return done(null, mockUser);
      } catch (error) {
        return done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));
```

---

## 4. Self-Contained Mini-Project: Google Auth Profile Page

We will build an Express application that authenticates users with Google OAuth and displays their profile avatar and email on a dashboard.

### Project Setup
```text
express-google-oauth/
├── server.js
└── package.json (requires: express, express-session, passport, passport-google-oauth20, dotenv)
```

### File: `server.js`
```javascript
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
require("dotenv").config();

const app = express();

app.use(session({
  secret: process.env.SESSION_SECRET || "google-demo-secret-key",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || "mock_id",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "mock_secret",
    callbackURL: "/auth/google/callback"
  },
  (token, tokenSecret, profile, done) => {
    // Collect profile details
    const user = {
      googleId: profile.id,
      name: profile.displayName,
      email: profile.emails[0].value,
      avatar: profile.photos[0].value
    };
    return done(null, user);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

app.get("/", (req, res) => {
  res.send('<h2>Welcome</h2><a href="/auth/google">Log in with Google</a>');
});

app.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

app.get("/auth/google/callback", 
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => res.redirect("/dashboard")
);

app.get("/dashboard", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).send("Access Denied: Please log in first.");
  }
  res.send(`
    <h2>User Profile</h2>
    <img src="${req.user.avatar}" referrerpolicy="no-referrer" style="border-radius: 50%; width: 100px;"><br>
    <p>Name: <b>${req.user.name}</b></p>
    <p>Email: <b>${req.user.email}</b></p>
    <a href="/logout">Logout</a>
  `);
});

app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

app.listen(3000, () => console.log("OAuth server running at http://localhost:3000"));
```

---

## 5. Advanced Production Practices & Security

### State Parameters & CSRF
OAuth flows can be vulnerable to Cross-Site Request Forgery (CSRF) attacks if an attacker intercepts the redirect flow.
- **Solution**: Passport-google-oauth20 enables `state` parameters automatically to prevent CSRF. Ensure your session configurations are securely encrypted in production.

### Google Console Whitelist Configuration
In the Google Cloud Console:
- Avoid using wildcard IPs or paths.
- Explicitly add your production domain to the **Authorized JavaScript Origins** (e.g. `https://my-app.com`) and **Authorized Redirect URIs** (e.g. `https://my-app.com/auth/google/callback`) lists. If the callback URL configured in your code does not match the Google Console settings exactly, Google will block the authentication attempt.

---

## 6. Key Takeaways
1. Register application hosts and callback routes inside the **Google Cloud Console (API Credentials section)** before running the strategy code.
2. The `scope` option specifies what user permissions you are requesting (e.g. `["profile", "email"]`).
3. Google OAuth redirects require absolute callback URLs. Ensure the `callbackURL` configured in your code matches the URI whitelisted in the Google console exactly.
