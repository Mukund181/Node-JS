// server/src/controllers/posts.js
const postModel = require("../models/post.js");
const cloudinary = require("cloudinary").v2;

async function createPost(req, res) {
    try {
        const { caption, image } = req.body;
        if (!caption || !image) {
            return res
                .status(400)
                .json({ message: "Caption and image are required" });
        }
        const result = await cloudinary.uploader.upload(image, {
            folder: "connectspace_posts",
            transformation: [{ width: 800, crop: "limit" }],
        });
        const post = await postModel.create({
            caption,
            image: result.secure_url,
            author: req.user._id,
        });
        // Populate author for the response
        const populated = await postModel
            .findById(post._id)
            .populate("author", "username avatar bio");
        return res
            .status(201)
            .json({ message: "Post created successfully", post: populated });
    } catch (err) {
        console.error("Error creating post:", err);
        return res
            .status(500)
            .json({ message: "Error creating post", error: err.message });
    }
}

async function getTimeline(req, res) {
    try {
        const posts = await postModel
            .find()
            .populate({
                path: "author",
                select: "username avatar bio email",
            })
            .populate({
                path: "likes",
                select: "username _id",
            })
            .populate({
                path: "comments.author",
                select: "username avatar",
            })
            .sort({ createdAt: -1 });

        // Filter out posts with deleted authors
        const validPosts = posts.filter(
            (post) => post.author !== null && post.author !== undefined
        );

        return res
            .status(200)
            .json({ message: "Posts fetched successfully", posts: validPosts });
    } catch (error) {
        console.error("Error fetching timeline:", error);
        return res
            .status(500)
            .json({ message: "Error fetching posts", error: error.message });
    }
}

async function likePost(req, res) {
    try {
        const { postId } = req.body;
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }

        const userId = req.user._id;
        const alreadyLiked = post.likes.some(
            (id) => id.toString() === userId.toString()
        );

        if (alreadyLiked) {
            // Unlike — remove user from likes array
            post.likes = post.likes.filter(
                (id) => id.toString() !== userId.toString()
            );
            await post.save();
            const populatedPost = await postModel
                .findById(postId)
                .populate("author", "username avatar bio")
                .populate("likes", "username")
                .populate("comments.author", "username avatar");
            return res
                .status(200)
                .json({ message: "Post unliked successfully", post: populatedPost });
        } else {
            // Like — add user to likes array
            post.likes.push(userId);
            await post.save();
            const populatedPost = await postModel
                .findById(postId)
                .populate("author", "username avatar bio")
                .populate("likes", "username")
                .populate("comments.author", "username avatar");
            return res
                .status(200)
                .json({ message: "Post liked successfully", post: populatedPost });
        }
    } catch (err) {
        console.error("Error liking post:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function commentPost(req, res) {
    try {
        const { postId, comment } = req.body;
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        if (!comment || !comment.trim()) {
            return res
                .status(400)
                .json({ message: "Comment cannot be empty" });
        }
        post.comments.push({ comment: comment.trim(), author: req.user._id });
        await post.save();
        const populatedPost = await postModel
            .findById(postId)
            .populate("author", "username avatar bio")
            .populate("likes", "username")
            .populate("comments.author", "username avatar");
        return res
            .status(200)
            .json({ message: "Comment added successfully", post: populatedPost });
    } catch (err) {
        console.error("Error commenting:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function deletePost(req, res) {
    try {
        const { postId } = req.params;
        const post = await postModel.findById(postId);
        if (!post) {
            return res.status(404).json({ message: "Post not found" });
        }
        // Only the author can delete
        if (post.author.toString() !== req.user._id.toString()) {
            return res
                .status(403)
                .json({ message: "Not authorized to delete this post" });
        }
        await postModel.findByIdAndDelete(postId);
        return res
            .status(200)
            .json({ message: "Post deleted successfully" });
    } catch (err) {
        console.error("Error deleting post:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getUserPosts(req, res) {
    try {
        const { userId } = req.params;
        const posts = await postModel
            .find({ author: userId })
            .populate("author", "username avatar bio")
            .populate("likes", "username")
            .populate("comments.author", "username avatar")
            .sort({ createdAt: -1 });
        return res
            .status(200)
            .json({ message: "User posts fetched", posts });
    } catch (err) {
        console.error("Error fetching user posts:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = {
    createPost,
    getTimeline,
    likePost,
    commentPost,
    deletePost,
    getUserPosts,
};