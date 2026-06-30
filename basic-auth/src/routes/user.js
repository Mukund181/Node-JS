// post some data like post with its caption
const express = require("express")
const userModel = require("../models/user.js")
const postModel = require("../models/post.js")
const jwt = require("jsonwebtoken")

const router = express.Router()

router.post("/createPost", async (req, res) => {
    const token = req.cookies.token;
    if (!token) {
        return res.status(401).json({
            msg: "Unauthorized"
        })
    }
    else {
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET)
            const user = await userModel.findById(payload.id)
            if (!user) {
                return res.json({
                    msg: "User not found"
                })
            }
            else {
                const post = await postModel.create({
                    post: req.body.post,
                    caption: req.body.caption,
                    user: user.username
                })
                return res.json({
                    msg: "Post created successfully",
                    post: post
                })
            }
        } catch (err) {
            return res.status(401).json({
                msg: "Forbidden"
            })
        }
    }
})

module.exports = router