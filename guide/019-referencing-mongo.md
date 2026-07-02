# Schema Relationships: Referenced Relationships

Referencing (normalization) is the process of splitting related data into separate collections and using reference identifiers (ObjectIds) to associate them.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
When child data is too large to embed or needs to be queried independently, NoSQL databases use **Referenced Relationships** (normalization).
Instead of nesting one document inside another, you store the related document's ID (`ObjectId`) in a field.
```json
// Authors Collection
{ "_id": "author_abc", "name": "J.K. Rowling" }

// Books Collection
{ "_id": "book_123", "title": "Harry Potter", "author": "author_abc" }
```

This structural pattern has several benefits:
- It keeps document sizes small, avoiding MongoDB's 16MB limit.
- It prevents data duplication: if an author updates their name, you only need to change it in one place (the Authors collection), and all referenced book documents will immediately reflect the update.

---

## 2. Theory & Deep Dive

### Referential Integrity
Unlike SQL databases, MongoDB does not enforce **referential integrity** at the database level. For example, if you delete an author document, MongoDB will not automatically check if any book documents still reference that author's ID, which can leave "orphan" references in your database.
- **Solution**: You must handle cascading deletes in your application code (e.g. using Mongoose pre-remove hooks) to clean up orphaned references.

---

## 3. Code Implementation

Here is how you configure Mongoose schemas for references:

### File: `models/Author.js`
```javascript
const mongoose = require("mongoose");

const authorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  bio: String
}, { timestamps: true });

module.exports = mongoose.model("Author", authorSchema);
```

### File: `models/Book.js`
```javascript
const mongoose = require("mongoose");

const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  genre: String,
  // Establishing connection using Schema.Types.ObjectId
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Author", // MUST match mongoose.model string definition of destination schema
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model("Book", bookSchema);
```

---

## 4. Self-Contained Mini-Project: Library Catalog Registry

We will build a simple Express library management API where Books reference Authors.

### Project Setup
```text
express-mongo-references/
├── server.js
└── package.json (requires: express, mongoose)
```

### File: `server.js`
```javascript
const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/library_ref_db");

// Models
const Author = mongoose.model("Author", new mongoose.Schema({
  name: String,
  country: String
}));

const Book = mongoose.model("Book", new mongoose.Schema({
  title: String,
  author: { type: mongoose.Schema.Types.ObjectId, ref: "Author", required: true }
}));

// Route 1: Create an Author
app.post("/authors", async (req, res) => {
  const author = await Author.create(req.body);
  res.status(201).json(author);
});

// Route 2: Create a Book referencing an Author ID
app.post("/books", async (req, res) => {
  try {
    const { title, authorId } = req.body;

    // Verify the referenced Author actually exists first
    const authorExists = await Author.findById(authorId);
    if (!authorExists) {
      return res.status(400).json({ error: "Cannot create book: Referenced Author does not exist." });
    }

    const book = await Book.create({
      title,
      author: authorId
    });

    res.status(201).json(book);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Route 3: List Books (returns raw ObjectId reference)
app.get("/books", async (req, res) => {
  const books = await Book.find();
  res.json(books);
});

app.listen(3000, () => console.log("Library ref registry active at http://localhost:3000"));
```

---

## 5. Advanced Production Practices & Security

### Cascading Deletes (Middleware Hook)
To prevent orphaned documents, define a Mongoose middleware pre-remove hook on the parent schema. This hook will automatically clean up all child documents that reference the parent when it is deleted:
```javascript
authorSchema.pre("deleteOne", { document: true, query: false }, async function (next) {
  try {
    // Delete all books referencing this author
    await mongoose.model("Book").deleteMany({ author: this._id });
    next();
  } catch (err) {
    next(err);
  }
});
```

---

## 6. Key Takeaways
1. The **`ref` property** is critical. It informs Mongoose which model schema to search when executing joins or populates.
2. Store the **`_id`** value of the parent document inside the child reference property.
3. Referencing prevents documents from reaching MongoDB's 16MB threshold but requires execution of secondary database searches or population steps to query details.
