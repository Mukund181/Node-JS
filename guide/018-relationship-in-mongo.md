# Schema Relationships: Embedded Subdocuments

In MongoDB, referencing and embedding are two primary ways of establishing relationships. Embedding stores nested subdocuments directly inside a parent document.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
When designing relationships in a NoSQL database, the primary question is whether to **embed** or **reference** related data.

Embedding involves storing a child document directly inside a parent document:
```json
{
  "_id": "post_1",
  "title": "My Post",
  "comments": [
    { "author": "Alice", "text": "Great read!" },
    { "author": "Bob", "text": "Interesting perspective." }
  ]
}
```

This structural pattern has significant performance advantages:
- Since all data is stored inside a single document on disk, you can retrieve the post and all its comments in a single database read, avoiding the need for joins or secondary queries.

---

## 2. Theory & Deep Dive

### Document Size Limits
MongoDB has a hard limit of **16MB** per individual document. If you embed data that grows without limit (e.g. storing millions of analytics logs inside a user document), the document will eventually hit this size threshold and crash.
- **Rule of Thumb**: Embed data only if the child collection has a bounded limit (e.g. a user having up to 5 shipping addresses). If the child collection can grow indefinitely, use referenced relationships instead.

---

## 3. Code Implementation

Here is how you design embedded schemas using Mongoose:

```javascript
const mongoose = require("mongoose");

// 1. Define Subdocument Schema first
const commentSchema = new mongoose.Schema({
  author: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    minlength: 1
  }
}, { timestamps: true });

// 2. Define Parent Schema, embedding subdocument as an array
const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  // Embed comments schema array directly
  comments: [commentSchema]
}, { timestamps: true });

const Post = mongoose.model("Post", postSchema);

// 3. Controller Actions to manipulate Embedded Collections
async function addCommentToPost(req, res) {
  try {
    const { postId } = req.params;
    const { author, text } = req.body;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    // Push new subdocument into the array
    post.comments.push({ author, text });
    
    // Save the parent document to finalize the write operation
    await post.save();

    res.status(201).json({ success: true, message: "Comment added", post });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}
```

---

## 4. Self-Contained Mini-Project: Article Review Engine

We will build a simple Express review engine where products contain a list of embedded reviews, and the server automatically calculates the product's average score when new reviews are added.

### Project Setup
```text
express-mongo-embedded/
├── server.js
└── package.json (requires: express, mongoose)
```

### File: `server.js`
```javascript
const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/embedded_reviews_db");

// Subdocument Schema
const ratingSchema = new mongoose.Schema({
  reviewer: String,
  stars: { type: Number, required: true, min: 1, max: 5 }
});

// Parent Schema
const productSchema = new mongoose.Schema({
  title: String,
  averageRating: { type: Number, default: 0 },
  ratings: [ratingSchema] // Embedded subdocument array
});

// Pre-save Middleware to calculate average rating automatically
productSchema.pre("save", function (next) {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
  } else {
    const total = this.ratings.reduce((sum, r) => sum + r.stars, 0);
    this.averageRating = total / this.ratings.length;
  }
  next();
});

const Product = mongoose.model("Product", productSchema);

// Create product endpoint
app.post("/products", async (req, res) => {
  const prod = await Product.create({ title: req.body.title });
  res.status(201).json(prod);
});

// Add review and trigger average recalculation
app.post("/products/:id/reviews", async (req, res) => {
  try {
    const { reviewer, stars } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    product.ratings.push({ reviewer, stars });
    await product.save(); // Saves parent document and runs validation/pre-save hooks

    res.status(200).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Reviews system running on http://localhost:3000"));
```

---

## 5. Advanced Production Practices & Security

### Race Conditions during Array Updates
If two users call `post.save()` at the same time to update the same document, Mongoose might overwrite changes from one of the users (e.g. saving state versions based on stale inputs).
- **Solution**: Use atomic MongoDB update operators like **`$push`** and **`$pull`** directly, bypassing the need to read and save the entire document:
  ```javascript
  await Product.findByIdAndUpdate(productId, {
    $push: { ratings: { reviewer, stars } }
  });
  ```

---

## 6. Key Takeaways
1. Subdocuments inside arrays are assigned unique automatic `_id` values by Mongoose, which you can fetch using `parentDoc.subdocs.id(subId)`.
2. Saving changes to a subdocument requires calling `.save()` on the **parent** document instance.
3. Keep MongoDB's maximum document size (16MB) in mind. Avoid embedding arrays that will grow indefinitely. Instead, use referenced schemas (see `019-referencing-mongo.md`).
