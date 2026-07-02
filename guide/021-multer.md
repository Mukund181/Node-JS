# File Uploads with Multer

Multer is a Node.js middleware for handling `multipart/form-data`, which is primarily used for uploading files (images, documents, audio, videos).

---

## 1. Prerequisites & Conceptual Basics

### Multipart/Form-Data Protocol
Standard forms send data using urlencoding (`key=value&key2=value2`). However, this format is inefficient for sending large binary files like images.
Instead, file uploads use the **`multipart/form-data`** format:
- The request body is split into multiple parts using a unique **boundary** string token.
- Each part contains its own headers (e.g. `Content-Disposition: form-data; name="avatar"; filename="photo.jpg"`) and binary body payload.
- Multer parses these streams, extracts the binary data, and saves it to disk or memory.

---

## 2. Theory & Deep Dive

### Storage Options
- **`diskStorage`**: Writes incoming files directly to the server's local hard drive. This is easy to set up but can consume disk space quickly and is not suitable for horizontal scaling.
- **`memoryStorage`**: Keeps the file as a raw buffer in RAM memory (`req.file.buffer`). This is useful if you want to process the file in code (e.g. resizing an image) or stream it directly to cloud storage providers (like Cloudinary or AWS S3) without writing to the server's local disk first.

---

## 3. Code Implementation

Install the dependency: `npm install multer`

```javascript
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();

const PORT = 3000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// 1. Configure storage options
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// 2. Configure file size and type filters
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const isExtensionValid = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const isMimeTypeValid = allowedTypes.test(file.mimetype);

  if (isExtensionValid && isMimeTypeValid) {
    cb(null, true);
  } else {
    cb(new Error("Only image files (jpg, jpeg, png, gif) are allowed!"), false);
  }
};

// 3. Initialize upload middleware instance
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Max file size: 5MB
  fileFilter: fileFilter
});
```

---

## 4. Self-Contained Mini-Project: Safe Profile Avatar Uploader

We will build an Express application that accepts avatar uploads, restricting files to PNG/JPEG format and capping sizes below 2MB.

### Project Setup
```text
express-multer-avatars/
├── server.js
├── public/
│   └── index.html
└── package.json (requires: express, multer)
```

### File: `server.js`
```javascript
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const app = express();

const dir = path.join(__dirname, "avatars");
if (!fs.existsSync(dir)) fs.mkdirSync(dir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, dir),
  filename: (req, file, cb) => {
    // Save as: avatar-[userid]-[timestamp].ext
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const mimetypes = ["image/png", "image/jpeg", "image/jpg"];
    if (mimetypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Upload Rejected: Invalid file type. Only PNG and JPEG are allowed."));
    }
  }
});

// HTML Interface
app.get("/upload", (req, res) => {
  res.send(`
    <h2>Avatar Upload Portal</h2>
    <form action="/upload" method="POST" enctype="multipart/form-data">
      <input type="file" name="avatarFile" required><br><br>
      <button type="submit">Upload Profile Picture</button>
    </form>
  `);
});

// Post handler
app.post("/upload", upload.single("avatarFile"), (req, res) => {
  if (!req.file) {
    return res.status(400).send("No file uploaded.");
  }
  res.send(`<h3>Upload Success!</h3><p>Saved as: ${req.file.filename}</p><a href="/upload">Back</a>`);
});

// Handle Multer size limit errors
app.use((err, req, res, next) => {
  res.status(400).send(`<h3>Upload Error</h3><p style="color:red;">${err.message}</p><a href="/upload">Try again</a>`);
});

app.listen(3000, () => console.log("Uploader running on http://localhost:3000/upload"));
```

---

## 5. Advanced Production Practices & Security

### Restricting DoS Attacks
If you do not specify a `fileSize` limit in your Multer options, attackers can upload extremely large files (e.g. 1GB videos), consuming all your server's disk space and memory, causing a Denial of Service (DoS) crash.
- **Solution**: Always set strict, small `limits.fileSize` values based on your application's requirements.

### Preventing Double Extension Attacks
Attackers can name malicious scripts like `malware.js.png`. If your code only checks for the presence of `.png` anywhere in the filename, you might accidentally run the script on your server.
- **Solution**: Always use `path.extname(file.originalname)` to extract the extension from the **end** of the filename, and verify the file's raw mime-type (`file.mimetype`).

---

## 6. Key Takeaways
1. Set the field name inside `upload.single("avatar")` to match the exact `name` attribute in your HTML file input form (`<input type="file" name="avatar" />`).
2. If uploading directly to cloud services (like Cloudinary or AWS S3), use **`multer.memoryStorage()`** instead of `diskStorage` to keep the file buffer in memory and upload it via streams, avoiding writing files to disk.
3. Always configure file filters and size limits to protect your server from malicious uploads and denial-of-service (DoS) attacks.
