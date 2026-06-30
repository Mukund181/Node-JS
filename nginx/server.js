const express = require("express")
const dotenv = require("dotenv")
const path = require("path")
const multer = require("multer")
const cloudinary = require("cloudinary").v2
const fs = require("fs")
const streamifier = require("streamifier")

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// Multer (memory storage)
const storage = multer.memoryStorage()
const upload = multer({ storage })

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Ensure docs folder exists
const docsPath = path.join(__dirname, "docs")
if (!fs.existsSync(docsPath)) {
  fs.mkdirSync(docsPath)
}

// Routes
app.get("/", (req, res) => {
  res.send("<h1>Welcome to Node.js with NGINX</h1><a href='/page1'>Register</a> <a href='/page2'>Login</a>")
})

app.get("/docs/:filename", (req, res) => {
  const filename = req.params.filename

  if (!filename) {
    return res.json({ message: "File not found" })
  }

  res.send(`
    <p>Click below to download ${filename}</p>
    <a href="/download/${filename}">
      <button>Download</button>
    </a>
  `)
})

app.get("/download/:filename", (req, res) => {
  const filename = req.params.filename

  if (!filename) {
    return res.json({ message: "File not found" })
  }

  res.download(path.join(__dirname, "docs", filename))
})

// Upload Route
app.get("/upload", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "index.html"))
})

app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    // safer filename (avoid overwrite)
    const filename = Date.now() + "-" + req.file.originalname
    const filepath = path.join(__dirname, "docs", filename)

    // 1. Save locally
    fs.writeFileSync(filepath, req.file.buffer)

    // 2. Upload to Cloudinary
    const cloudResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: "docs",
          public_id: filename,
          resource_type: "raw"
        },
        (error, result) => {
          if (error) reject(error)
          else resolve(result)
        }
      )

      streamifier.createReadStream(req.file.buffer).pipe(stream)
    })

    // 3. Response
    res.send(`
  <h2>File Uploaded Successfully</h2>

  <p><b>Cloudinary URL:</b></p>
  <a href="${cloudResult.secure_url}" target="_blank">
    ${cloudResult.secure_url}
  </a>

  <p><b>Download Local File:</b></p>
  <a href="/download/${filename}">
    <button>Download</button>
  </a>

  <br><br>
  <a href="/upload">Upload another file</a>
`)

  } catch (e) {
    console.error(e)
    res.status(500).json({ message: "Error uploading file" })
  }
})

// Pages
app.get("/page1", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "page1.html"))
})

app.get("/page2", (req, res) => {
  res.sendFile(path.join(__dirname, "html", "page2.html"))
})

// Server
app.listen(PORT, () => {
  console.log(`server running on port ${PORT}`)
})