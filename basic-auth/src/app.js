const express = require("express")
const cookieParser = require("cookie-parser")
require("dotenv").config()
const authRouter = require("./routes/auth.js")
const userRouter = require("./routes/user.js")

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
module.exports = app;