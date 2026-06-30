const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    username : {
        type : String,
        required : true,
        unique : true,
        minlength : 3,
        maxlength : 20
    },
    email : {
        type : String,
        required : true,
        unique : true,
        match: [
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            "Please enter a valid email"
        ]
    },
    password: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: ["student", "teacher", "admin"],
        default: "student"
    }
})

const userModel = mongoose.model("users",userSchema)

module.exports = userModel