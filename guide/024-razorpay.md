# Payment Integration with Razorpay

Razorpay is a popular payment gateway integration service in India that allows businesses to accept, process, and disburse payments.

---

## 1. Prerequisites & Conceptual Basics

### The Payment Processing Lifecycle
For security reasons (specifically PCI-DSS compliance), servers should never collect or store credit card numbers or banking passwords directly. Instead, payment processors act as middle-agents.

A secure payment workflow follows these steps:
1. The customer initiates a purchase.
2. Your server registers an **Order ID** with the payment gateway (specifying the amount and currency).
3. The server sends this Order ID to the frontend client.
4. The client uses the payment gateway's checkout modal to complete the payment.
5. The payment gateway returns a success token containing signature hashes.
6. Your server verifies these signature hashes to ensure the client has not tampered with the transaction details before finalizing the order.

---

## 2. Theory & Deep Dive

### Cryptographic Signature Verification
When a payment is completed, Razorpay returns a `razorpay_signature`. Your server must verify this signature by creating a SHA256 HMAC hash using the format:
`razorpay_order_id + "|" + razorpay_payment_id`
Using your private key secret. If the generated hash matches the signature returned by the client, the transaction is verified.

---

## 3. Code Implementation

First, install the Razorpay SDK: `npm install razorpay crypto dotenv`

Set up credentials inside your `.env` file:
```env
RAZORPAY_KEY_ID=your_key_id
RAZORPAY_KEY_SECRET=your_key_secret
```

### Server Route Actions

```javascript
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const router = express.Router();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// STEP 1: Create Order Endpoint
router.post("/payments/order", async (req, res) => {
  try {
    const { amount } = req.body; // Amount in rupees from client

    if (!amount) {
      return res.status(400).json({ success: false, message: "Amount is required" });
    }

    // Razorpay processes amounts in the smallest currency unit (paise for INR).
    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`
    };

    const order = await razorpay.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

---

## 4. Self-Contained Mini-Project: Donation Portal

We will build a simple Express donation server that registers orders and verifies the payment signatures returned by the client.

### Project Setup
```text
express-razorpay-donation/
├── server.js
└── package.json (requires: express, razorpay, dotenv)
```

### File: `server.js`
```javascript
const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(express.json());

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "mock_key_id",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "mock_key_secret"
});

// Serve frontend page
app.get("/checkout", (req, res) => {
  res.send(`
    <h2>Charity Donation Portal</h2>
    <input type="number" id="amtInput" placeholder="Amount (INR)" value="10">
    <button onclick="payNow()">Donate Now</button>

    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
    <script>
      async function payNow() {
        const amt = document.getElementById("amtInput").value;
        
        // 1. Create order on server
        const res = await fetch("/payment/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: amt })
        });
        const orderData = await res.json();

        // 2. Open Razorpay Modal
        const options = {
          key: "${process.env.RAZORPAY_KEY_ID || 'mock_key_id'}",
          amount: orderData.amount,
          currency: "INR",
          name: "Charity Foundation",
          order_id: orderData.orderId,
          handler: async function (response) {
            // 3. Send verification signature back to server
            const verifyRes = await fetch("/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response)
            });
            const verifyData = await verifyRes.json();
            alert(verifyData.message);
          }
        };
        const rzpModal = new Razorpay(options);
        rzpModal.open();
      }
    </script>
  `);
});

// CREATE Order Route
app.post("/payment/order", async (req, res) => {
  const options = {
    amount: Number(req.body.amount) * 100, // convert to paise
    currency: "INR",
    receipt: "receipt_1"
  };
  try {
    const order = await rzp.orders.create(options);
    res.json({ orderId: order.id, amount: order.amount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// VERIFY Signature Route
app.post("/payment/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "mock_key_secret");
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generatedSignature = hmac.digest("hex");

  if (generatedSignature === razorpay_signature) {
    res.json({ success: true, message: "Payment Verified Successfully!" });
  } else {
    res.status(400).json({ success: false, message: "Verification Failed: Invalid Signature Hash." });
  }
});

app.listen(3000, () => console.log("Checkout server running on http://localhost:3000/checkout"));
```

---

## 5. Advanced Production Practices & Security

### Handling Network Drops (Webhooks)
If a customer's internet connection drops after they complete a payment but before the browser sends the verification request to your server, they will be charged, but your database will not record the purchase.
- **Solution**: Set up a **Razorpay Webhook listener**. Webhooks are asynchronous, server-to-server notifications sent by Razorpay directly to your backend API to notify you when a payment completes. Always use a dedicated route and signature verification to handle webhook requests safely.

---

## 6. Key Takeaways
1. **Never finalize orders based on frontend requests alone.** Always verify signatures on the backend using the HMAC crypto hash verification step before fulfilling orders or updating database records.
2. Razorpay processes amounts in **paise**. If you pass `500` directly as the amount, the customer will only be charged `Rs 5.00`. Ensure you convert amounts properly (`amount * 100`).
3. Store raw API keys in `.env`. Exposing `key_secret` on the frontend compromise your funds security.
