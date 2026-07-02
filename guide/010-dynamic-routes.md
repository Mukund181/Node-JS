# Express.js Dynamic Routes

Dynamic routes allow your application to accept variable segments in route URLs, enabling clean routing designs where the structure of the URL dictates what data is fetched.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
When writing endpoints, users expect parameters to be passed cleanly inside URL pathways.
For example, instead of querying an article using a search parameter:
`http://myblog.com/articles?id=45`
We prefer clean, human-readable URLs:
`http://myblog.com/articles/45`

In this example, `45` is a dynamic value. When defining this route in Express, we declare a variable placeholder by prefixing the path segment with a colon (`:id`). The routing engine matches the incoming path structure and extracts the matching value.

---

## 2. Theory & Deep Dive

### Query vs Params
- **`req.params` (Path Parameters)**: Used to identify specific resources. For example, `/users/:id` maps directly to a specific user record.
- **`req.query` (Query Parameters)**: Used to filter, sort, or paginate resources. For example, `/users?sort=asc&page=2`.

---

## 3. Basic Code Implementation

Here is how you handle dynamic path variables in Express:

```javascript
const express = require("express");
const app = express();

const PORT = 3000;

// 1. Single Route Parameter
app.get("/users/:userId", (req, res) => {
  // Capture dynamic values from req.params
  const userId = req.params.userId;
  
  res.json({
    message: "Dynamic User Route Called",
    receivedUserId: userId
  });
});

// 2. Multiple/Nested Route Parameters
app.get("/categories/:catName/products/:prodId", (req, res) => {
  const { catName, prodId } = req.params;

  res.json({
    category: catName,
    productId: prodId,
    description: `Fetching product ${prodId} within ${catName} category.`
  });
});

// 3. Dynamic route pattern with strict regex match constraints
// This route will only trigger if the orderId parameter is numeric.
app.get("/orders/:orderId(\\d+)", (req, res) => {
  const orderId = req.params.orderId;
  res.json({
    message: "Numeric Order Route matched successfully",
    orderId
  });
});
```

---

## 4. Self-Contained Mini-Project: Blog Article Directory

We will build a simple mock blog directory lookup endpoint that retrieves posts by category and slug, rejecting invalid URLs.

### Project Setup
```text
express-dynamic-blog/
├── server.js
└── package.json (requires: express)
```

### File: `server.js`
```javascript
const express = require("express");
const app = express();

const articles = [
  { slug: "learn-node-js", title: "Learning Node.js Fast", category: "tech" },
  { slug: "cooking-tips", title: "10 Quick Kitchen Tips", category: "food" },
  { slug: "javascript-basics", title: "JS closures explained", category: "tech" }
];

// Route 1: List all articles in a specific category
app.get("/posts/category/:categoryName", (req, res) => {
  const category = req.params.categoryName.toLowerCase();
  const matched = articles.filter(a => a.category === category);
  
  res.json({
    category: category,
    count: matched.length,
    posts: matched
  });
});

// Route 2: Get specific article by slug
app.get("/posts/item/:articleSlug", (req, res) => {
  const slug = req.params.articleSlug.toLowerCase();
  const matchedArticle = articles.find(a => a.slug === slug);

  if (!matchedArticle) {
    return res.status(404).json({ error: `Article matching slug '${slug}' not found.` });
  }

  res.json({ success: true, article: matchedArticle });
});

// Route 3: Overlapping Route Warning
// Placing /posts/item/new before dynamic routes protects new endpoints
app.get("/posts/item/new", (req, res) => {
  res.json({ message: "Form page for posting new articles." });
});

app.listen(3000, () => console.log("Blog routing app running on http://localhost:3000"));
```

---

## 5. Advanced Production Practices & Security

### Injection Vulnerabilities
Dynamic parameters are often passed directly into database queries (e.g. `User.find({ id: req.params.id })`). If validation is missing, attackers can perform NoSQL/SQL injection attacks.
- **Solution**: Always validate and sanitize route parameters. Convert variables to integers, check UUID formats, or use schemas before querying the database.

### Overlapping Route Pitfalls
If you declare `/posts/:id` **before** `/posts/new`, a request to `/posts/new` will be intercepted by the dynamic route, treating `"new"` as the dynamic `:id` value. Always place specific static routes above generic dynamic routes.

---

## 6. Key Takeaways
1. Express extracts parameters as standard JavaScript strings. If you need integers (e.g., matching Database primary keys), you must convert them manually (e.g. `parseInt(req.params.id, 10)`).
2. Dynamic routes are matched sequentially from top to bottom. Make sure to define static routes (e.g., `/users/profile`) **before** dynamic routes (e.g., `/users/:id`), otherwise the static route will be incorrectly matched as a dynamic parameter (e.g., `id = "profile"`).
