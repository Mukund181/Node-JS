# Mongoose Population (`.populate()`)

Population is the process of replacing reference paths (ObjectIds) in a document with the actual documents from another collection.

---

## 1. Prerequisites & Conceptual Basics

### Dereferencing ObjectIds
When you design schemas with referenced relationships (as detailed in `019-referencing-mongo.md`), child documents store only the parent document's `ObjectId` (e.g. `"author": "507f1f77bcf86cd799439011"`).

If a client wants to read a list of books and display the author's name, you have two options:
1. Query the books list, extract the author IDs, and make a separate database query to fetch those authors' names (creating high latency and redundant code).
2. Use Mongoose **Population**. By appending `.populate("author")` to your query, Mongoose automatically executes the secondary query behind the scenes and replaces the `ObjectId` with the corresponding author document:
   ```json
   "author": { "_id": "507f1f77bcf86cd799439011", "name": "J.K. Rowling" }
   ```

---

## 2. Theory & Deep Dive

### Under the Hood
MongoDB does not support traditional relational database `JOIN` operations natively. 
Mongoose population is entirely application-side join emulation. It executes a query to read the primary collection (e.g. Books), collects all reference IDs, performs a second query (e.g. `Author.find({ _id: { $in: ids } })`), and maps the results back into memory.
Consequently, populating references on very large datasets can create substantial CPU and network overhead.

---

## 3. Code Implementation

Using the `Author` and `Book` models from the previous guide, here is how you populate references:

```javascript
const Book = require("./models/Book");
const Author = require("./models/Author");

// 1. Fetch books and populate author details
async function getBooksWithAuthor(req, res) {
  try {
    const books = await Book.find().populate("author");
    res.status(200).json({ success: true, count: books.length, books });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// 2. Fetch books, populating only SPECIFIC fields of the author
async function getBooksSummary(req, res) {
  try {
    const books = await Book.find().populate("author", "name"); // Only fetches 'name' and '_id'
    res.status(200).json({ success: true, books });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## 4. Self-Contained Mini-Project: Social Media Feed API

We will build an Express backend for a social feed, retrieving posts with populated user profiles while excluding password hashes.

### Project Setup
```text
express-mongo-feed/
├── server.js
└── package.json (requires: express, mongoose)
```

### File: `server.js`
```javascript
const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/social_feed_db");

// Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true } // Exclude this in populate queries
});
const User = mongoose.model("User", userSchema);

const postSchema = new mongoose.Schema({
  title: String,
  body: String,
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
});
const Post = mongoose.model("Post", postSchema);

// Seed database helper
app.post("/seed", async (req, res) => {
  await User.deleteMany({});
  await Post.deleteMany({});

  const u1 = await User.create({ username: "john_doe", email: "john@test.com", password: "hashed_password_123" });
  const u2 = await User.create({ username: "jane_doe", email: "jane@test.com", password: "hashed_password_456" });

  await Post.create([
    { title: "Hello World", body: "First post content", creator: u1._id },
    { title: "Mongoose Tips", body: "How to populate objects", creator: u2._id }
  ]);

  res.send("Social feed seeded.");
});

// GET Feed Route (returns posts with creators populated)
app.get("/feed", async (req, res) => {
  try {
    // Populate 'creator', fetch only 'username' and 'email', exclude 'password'
    const feed = await Post.find()
      .populate("creator", "username email");

    res.json({ success: true, count: feed.length, posts: feed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Feed API active at http://localhost:3000/feed"));
```

---

## 5. Advanced Production Practices & Security

### The N+1 Query Problem
If you query child documents without batching (e.g. running a `.populate()` query inside a manual loop over array elements), the server will make separate query calls for every single document. This is known as the **N+1 Query Problem** and will quickly degrade database performance.
- **Solution**: Always let Mongoose resolve references in bulk by applying `.populate()` at the query level (e.g. `Model.find().populate()`), which handles batching automatically.

### MongoDB Native Aggregation (`$lookup`)
For high-traffic operations, using MongoDB native aggregation pipelines with the **`$lookup`** stage can yield much faster performance than Mongoose population, since joins are performed directly on the MongoDB database engine.

---

## 6. Key Takeaways
1. `.populate()` does not perform SQL-style database-side `JOIN` queries. Instead, Mongoose executes secondary queries automatically in the background, making it critical to use indexing on reference keys for performance.
2. You can chain multiple `.populate()` calls if a schema contains more than one reference field (e.g. `.populate("author").populate("publisher")`).
3. Limit returned payload sizes by specifying exact properties inside the second argument (e.g. `.populate("author", "username email")`), ensuring sensitive fields like hashed passwords are not leaked to frontend clients.
