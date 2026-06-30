// server/src/routes/chats.js
// TODO: Implement your chat routing (retrieving encrypted message logs, posting message packets) here.

const express = require("express");
const router = express.Router();
const authorizeUser = require("../middleware/auth");
const msgController = require("../controllers/chats");

router.get("/getMessages",authorizeUser,msgController.getMessages)
router.post("/postMessage",authorizeUser,msgController.postMessage)

module.exports = router;