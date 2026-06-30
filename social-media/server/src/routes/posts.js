// server/src/routes/posts.js
const express = require("express");
const router = express.Router();
const authorizeUser = require("../middleware/auth");
const postController = require("../controllers/posts");

router.post("/create", authorizeUser, postController.createPost);
router.get("/timeline", authorizeUser, postController.getTimeline);
router.post("/like", authorizeUser, postController.likePost);
router.post("/comment", authorizeUser, postController.commentPost);
router.delete("/:postId", authorizeUser, postController.deletePost);
router.get("/user/:userId", authorizeUser, postController.getUserPosts);

module.exports = router;