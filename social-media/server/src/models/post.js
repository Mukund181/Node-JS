// server/src/models/Post.js
// TODO: Define your Mongoose Post Schema here (author, imageUrl, caption, likes, comments).

const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
    author : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    image : {
        type : String,
        required : true
    },
    caption : {
        type : String,
        required : true
    },
    likes : [{
        type : mongoose.Schema.Types.ObjectId,
        ref : "User"
    }],
    comments : [{
        author : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User"
        },
        comment : String
    }]
}, { timestamps: true })

const postModel = mongoose.model("Post",postSchema);
module.exports = postModel