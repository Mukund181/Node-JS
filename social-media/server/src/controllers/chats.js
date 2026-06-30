// server/src/controllers/chats.js
const userModel = require("../models/user.js");
const msgModel = require("../models/message.js");

/**
 * GET /getMessages
 * Retrieves all encrypted messages between the authenticated user and another user
 * Query params: receiverId (the other user in the conversation)
 */
async function getMessages(req, res) {
    try {
        const { receiverId } = req.query;
        const senderId = req.user._id;

        // Input validation
        if (!receiverId) {
            return res.status(400).json({
                message: "receiverId is required as query parameter",
            });
        }

        if (senderId.toString() === receiverId.toString()) {
            return res.status(400).json({
                message: "Cannot fetch messages with yourself",
            });
        }

        // Verify receiver exists
        const receiver = await userModel.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: "Receiver not found" });
        }

        // Fetch messages in both directions, sorted chronologically
        const messages = await msgModel
            .find({
                $or: [
                    { sender: senderId, receiver: receiverId },
                    { sender: receiverId, receiver: senderId },
                ],
            })
            .sort({ createdAt: 1 });

        return res.status(200).json({
            message: "Messages fetched successfully",
            count: messages.length,
            messages,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

/**
 * POST /postMessage
 * Sends an encrypted message from authenticated user to receiver
 * Body: receiverId, encryptedMessage, encryptedKey, iv
 */
async function postMessage(req, res) {
    try {
        const { receiverId, encryptedMessage, encryptedKey, iv } = req.body;
        const senderId = req.user._id;

        // Input validation
        if (!receiverId || !encryptedMessage || !encryptedKey || !iv) {
            return res.status(400).json({
                message:
                    "All fields required: receiverId, encryptedMessage, encryptedKey, iv",
            });
        }

        if (senderId.toString() === receiverId.toString()) {
            return res.status(400).json({
                message: "Cannot send messages to yourself",
            });
        }

        // Verify receiver exists
        const receiver = await userModel.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ message: "Receiver not found" });
        }

        // Create and save the encrypted message
        const newMessage = await msgModel.create({
            sender: senderId,
            receiver: receiverId,
            encryptedMessage,
            encryptedKey,
            iv,
        });

        return res.status(201).json({
            message: "Message sent successfully",
            messageId: newMessage._id,
            data: newMessage,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = { getMessages, postMessage };