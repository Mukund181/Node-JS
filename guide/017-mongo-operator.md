# Mongoose Query Operators

Mongoose query operators allow you to perform advanced searches, sorting, ranges, logical conditions, and array matching on database collections.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
When searching a database, a basic query matches exact values:
`Task.find({ completed: true })`

However, real-world applications require more complex queries, such as:
- Finding products in a price range (e.g. `$gte: 10` and `$lte: 50`).
- Searching for posts that belong to category A **OR** category B.
- Verifying if an optional field exists in a document (e.g. `$exists: true`).

MongoDB provides specialized operators prefixed with `$` to perform these calculations efficiently on the database side before returning results.

---

## 2. Theory & Deep Dive

### Query Operator Categories
- **`$gt` / `$gte` / `$lt` / `$lte`**: Greater than, Greater than/equal, Less than, Less than/equal.
- **`$in`**: Accepts an array of values. Matches if the field's value matches any element in the array.
- **`$or`**: Accepts an array of expression objects. Matches if **any** of the expressions evaluate to true.
- **`$and`**: Matches if **all** expressions evaluate to true.

---

## 3. Code Implementation

Consider a `Product` model schema containing properties `price` (number), `category` (string), and `tags` (array of strings).

Here is how you apply query operators in controllers:

```javascript
const Product = require("../models/product");

// 1. Comparison Operator -> Range matching (e.g. Price between min and max)
async function getProductsByPriceRange(req, res) {
  try {
    const { minPrice, maxPrice } = req.query;

    const products = await Product.find({
      price: {
        $gte: Number(minPrice || 0),
        $lte: Number(maxPrice || 1000)
      }
    });

    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

// 2. Logical Operator -> $or condition
async function searchProducts(req, res) {
  try {
    const { keyword } = req.query;

    const products = await Product.find({
      $or: [
        { category: keyword },
        { tags: { $in: [keyword] } } // Checks if tags array contains the keyword
      ]
    });

    res.status(200).json({ success: true, products });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}
```

---

## 4. Self-Contained Mini-Project: Advanced Search Filter Catalog

We will build an Express e-commerce API that filters a product database using compound conditions, supporting category arrays and pricing limits.

### Project Setup
```text
express-mongo-operators/
├── server.js
└── package.json (requires: express, mongoose)
```

### File: `server.js`
```javascript
const express = require("express");
const mongoose = require("mongoose");
const app = express();

app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/operator_store_db");

const itemSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  clearance: { type: Boolean, default: false }
});
const Item = mongoose.model("Item", itemSchema);

// Seed database helper
app.post("/seed", async (req, res) => {
  await Item.deleteMany({});
  await Item.create([
    { name: "Running Shoes", price: 80, category: "footwear" },
    { name: "Socks", price: 10, category: "footwear" },
    { name: "Laptop", price: 1200, category: "electronics" },
    { name: "Charger Cable", price: 25, category: "electronics", clearance: true }
  ]);
  res.send("Database populated with mock items.");
});

// Advanced Filter Route
app.get("/items/filter", async (req, res) => {
  try {
    const { maxPrice, categories, onClearance } = req.query;
    let queryConditions = {};

    // 1. Price comparison boundary check
    if (maxPrice) {
      queryConditions.price = { $lte: Number(maxPrice) };
    }

    // 2. Categories array match ($in list)
    if (categories) {
      // Expecting comma-separated categories: ?categories=footwear,electronics
      const catList = categories.split(",");
      queryConditions.category = { $in: catList };
    }

    // 3. Optional element exists condition
    if (onClearance === "true") {
      queryConditions.clearance = { $exists: true, $eq: true };
    }

    // Execute query
    const results = await Item.find(queryConditions);
    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log("Operators filter running on http://localhost:3000"));
```

---

## 5. Advanced Production Practices & Security

### Query Optimization (Indexes)
Using operators like `$gt` or `$or` on large collections can trigger **collection scans** (where MongoDB reads every document on disk from start to finish), causing high latency.
- **Solution**: Create indexes on fields that are queried frequently.
  ```javascript
  // Create an index on the price field to optimize price range queries
  itemSchema.index({ price: 1 });
  ```

### Profiling Queries (`explain`)
You can inspect how MongoDB executes your queries by appending `.explain("executionStats")` to your Mongoose chain:
```javascript
const explanation = await Item.find({ price: { $lte: 100 } }).explain("executionStats");
console.log(explanation.executionStats); 
// Check 'totalDocsExamined' vs 'nReturned' values to analyze index efficiency.
```

---

## 6. Key Takeaways
1. Always convert URL query strings to matching types (e.g. convert string numbers to actual floats or integers using `Number()`) before feeding them into operators like `$gt` or `$lte`.
2. The `$in` operator is highly efficient for batch-fetching multiple records based on array matching.
3. Logical operator `$or` accepts an array of expression objects. If any single expression matches, the document is returned.
