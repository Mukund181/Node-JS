const mongoose = require("mongoose")

const postSchema = new mongoose.Schema({
    post: {
        type: String,
        required: true
    },
    caption: {
        type: String,
        required: true
    },
    user: {
        type: String,
        required: true
    }
}, { timestamps: true })

const postModel = mongoose.model("posts", postSchema)

module.exports = postModel
