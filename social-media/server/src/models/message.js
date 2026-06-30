// server/src/models/message.js
// Mongoose Message Schema for E2EE chats

const mongoose = require("mongoose");

const msgSchema = new mongoose.Schema(
    {
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        receiver: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        encryptedMessage: {
            type: String,
            required: true,
        },
        encryptedKey: {
            type: String,
            required: true,
        },
        iv: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const msgModel = mongoose.model("Message", msgSchema);

module.exports = msgModel;