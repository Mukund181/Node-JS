// server/src/routes/auth.js
const express = require("express");
const router = express.Router();
const { signUp, signIn, logout, updateProfile, getPublicKey } = require("../controllers/auth");
const authorizeUser = require("../middleware/auth");
const userModel = require("../models/user");

// Public routes
router.post("/register", signUp);
router.post("/login", signIn);
router.post("/logout", logout);

// Protected routes
router.get("/profile", authorizeUser, (req, res) => {
    res.status(200).json({ message: "Profile retrieved", user: req.user });
});

router.put("/profile", authorizeUser, updateProfile);

router.get("/users", authorizeUser, async (req, res) => {
    try {
        const users = await userModel.find(
            { _id: { $ne: req.user._id } },
            "username avatar bio"
        );
        res.status(200).json({ message: "Users fetched", users });
    } catch (error) {
        res.status(500).json({ message: "Internal Server Error" });
    }
});

router.get("/publickey/:userId", authorizeUser, getPublicKey);

module.exports = router;
