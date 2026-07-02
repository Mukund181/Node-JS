# API Testing with Postman

Postman is a popular API client workspace platform that allows developers to design, build, test, and document APIs by sending HTTP requests and inspecting responses.

---

## 1. Prerequisites & Conceptual Basics

### Theoretical Basics
When writing backend code (like routing or controllers), you need a way to test your APIs. You can test simple HTTP GET requests directly in your browser's address bar, but testing POST, PUT, or DELETE requests requires writing client-side AJAX code (like `fetch` or Axios).
Postman acts as a graphical client that bypasses the need for frontend code. It allows you to:
- Select any HTTP method (GET, POST, PUT, DELETE, etc.).
- Set custom headers (e.g. `Authorization` tokens).
- Configure request payloads (JSON, form-data, file buffers).
- Send the request and view the server's response headers, status codes, and body details.

---

## 2. Theory & Deep Dive

### Postman Collections & Environments
- **Collections**: Folders used to group related API requests (e.g. "Auth System", "Product Catalog").
- **Environments**: Variable sets that let you change the target server dynamically. For example, you can define a variable `{{baseUrl}}` that points to `http://localhost:3000` during local development and redirects to `https://api.myproduction.com` in production, without needing to re-write individual requests.

---

## 3. How to Test Backend Endpoints using Postman

### 1. Testing a GET Request (with Query Params)
- **Method**: Select `GET` from the dropdown list.
- **URL**: `http://localhost:3000/search`
- **Params Tab**: Under `Query Params`, enter key-value pairs:
  - Key: `term`, Value: `node-js`
- **Resulting URL**: `http://localhost:3000/search?term=node-js`

### 2. Testing a POST Request (with JSON Body)
- **Method**: Select `POST`.
- **URL**: `http://localhost:3000/api/login`
- **Headers Tab**: Set `Content-Type` to `application/json`.
- **Body Tab**: 
  1. Select **raw** radio button.
  2. Select **JSON** from the format dropdown.
  3. Enter the payload:
     ```json
     {
       "email": "mukund@example.com",
       "password": "SecurePassword123!"
     }
     ```

---

## 4. Self-Contained Mini-Project: Checkout API with Test Assertions

We will build a simple Express checkout mock server. We will write JavaScript test assertions inside Postman to validate the server responses.

### Project Setup
```text
express-postman-assertions/
├── server.js
└── package.json (requires: express)
```

### File: `server.js`
```javascript
const express = require("express");
const app = express();

app.use(express.json());

app.post("/api/checkout", (req, res) => {
  const { cartItems, promoCode } = req.body;

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ success: false, message: "Cart cannot be empty" });
  }

  let total = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  let discount = 0;

  if (promoCode === "SAVE10") {
    discount = total * 0.10;
    total = total - discount;
  }

  res.status(200).json({
    success: true,
    subtotal: total + discount,
    discount: discount,
    finalTotal: total
  });
});

app.listen(3000, () => console.log("Checkout test mock running on http://localhost:3000"));
```

### Postman Test Suite Setup
1. Create a `POST` request to `http://localhost:3000/api/checkout`.
2. Set the Request Body as JSON:
   ```json
   {
     "cartItems": [
       { "name": "Keyboard", "price": 50, "quantity": 1 },
       { "name": "Mouse", "price": 20, "quantity": 2 }
     ],
     "promoCode": "SAVE10"
   }
   ```
3. Navigate to the **Tests** tab in Postman and add the following assertions:
   ```javascript
   // Test 1: Verify the HTTP status code is 200 OK
   pm.test("Status code is 200", function () {
       pm.response.to.have.status(200);
   });

   // Test 2: Verify the response has correct JSON structure
   pm.test("Calculate correct discount", function () {
       var jsonData = pm.response.json();
       pm.expect(jsonData.success).to.eql(true);
       pm.expect(jsonData.subtotal).to.eql(90); // 50*1 + 20*2 = 90
       pm.expect(jsonData.discount).to.eql(9);  // 10% of 90 = 9
       pm.expect(jsonData.finalTotal).to.eql(81); // 90 - 9 = 81
   });
   ```
4. Click **Send** in Postman and check the **Test Results** tab in the response pane to verify that all assertions pass successfully.

---

## 5. Advanced Production Practices & Security

### Newman CLI Automation
In modern DevOps pipelines (CI/CD), manually clicking "Send" in Postman to test endpoints is inefficient.
- **Newman** is the command-line companion for Postman. It allows you to run collection files directly from your terminal or build server:
  ```bash
  npm install -g newman
  newman run my-api-collection.json -e development-env.json
  ```

### API Keys Security
Never commit Postman environment files containing production passwords, API secret keys, or JWT tokens to Git repositories. Keep production keys stored in local environment variables.

---

## 6. Key Takeaways
1. Always keep local servers active (`npm run dev`) before executing requests in Postman.
2. Monitor response **Status Codes** (`2xx` for success, `4xx` for client errors, `5xx` for server crashes).
3. Utilize Postman **Environments** to declare variables for baseUrl, reducing the need to re-type URLs.
