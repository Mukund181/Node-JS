// server/src/controllers/auth.js
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cloudinary = require("cloudinary").v2;
const userModel = require("../models/user");

// Cookie options for security
const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 15 * 24 * 60 * 60 * 1000, // 15 days
    secure: process.env.NODE_ENV === "production",
};

async function signUp(req, res) {
    try {
        const data = req.body;
        const isUser = await userModel.findOne({ email: data.email });
        if (isUser) {
            return res.status(400).json({ message: "User already exists" });
        }
        const passwordRegex =
            /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(data.password)) {
            return res.status(400).json({
                message:
                    "Password must be at least 8 characters and contain at least one uppercase letter, one number, and one special character",
            });
        }
        const hash = await bcrypt.hash(data.password, 10);
        const user = await userModel.create({
            username: data.username,
            email: data.email,
            password: hash,
            bio: data.bio || "",
            publicKeyBase64: data.publicKeyBase64 || "",
        });

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "15d",
        });
        res.cookie("token", token, COOKIE_OPTIONS);

        // Return user WITHOUT password hash
        const safeUser = user.toObject();
        delete safeUser.password;

        return res
            .status(201)
            .json({ message: "User registered successfully", user: safeUser });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function signIn(req, res) {
    try {
        const data = req.body;
        const user = await userModel
            .findOne({ email: data.email })
            .select("+password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        const valid = await bcrypt.compare(data.password, user.password);
        if (!valid) {
            return res.status(401).json({ message: "Invalid Password" });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
            expiresIn: "15d",
        });
        res.cookie("token", token, COOKIE_OPTIONS);

        // Return user WITHOUT password hash
        const safeUser = user.toObject();
        delete safeUser.password;

        return res
            .status(200)
            .json({ message: "User signed in successfully", user: safeUser });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function logout(req, res) {
    try {
        res.clearCookie("token", COOKIE_OPTIONS);
        return res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function updateProfile(req, res) {
    try {
        const { bio, avatar: avatarData } = req.body;
        const updateFields = {};

        if (bio !== undefined) {
            updateFields.bio = bio;
        }

        // Handle avatar upload if base64 image provided
        if (avatarData && avatarData.startsWith("data:image")) {
            try {
                // Delete old avatar from Cloudinary if exists
                if (req.user.avatar?.public_id) {
                    await cloudinary.uploader.destroy(req.user.avatar.public_id);
                }
                const result = await cloudinary.uploader.upload(avatarData, {
                    folder: "connectspace_avatars",
                    width: 256,
                    height: 256,
                    crop: "fill",
                    gravity: "face",
                });
                updateFields.avatar = {
                    url: result.secure_url,
                    public_id: result.public_id,
                };
            } catch (uploadErr) {
                console.log("Avatar upload error:", uploadErr);
                return res
                    .status(400)
                    .json({ message: "Failed to upload avatar" });
            }
        }

        const user = await userModel.findByIdAndUpdate(
            req.user._id,
            { $set: updateFields },
            { new: true }
        );

        return res
            .status(200)
            .json({ message: "Profile updated successfully", user });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

async function getPublicKey(req, res) {
    try {
        const { userId } = req.params;
        const user = await userModel.findById(userId, "publicKeyBase64 username");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        return res.status(200).json({
            message: "Public key fetched",
            publicKeyBase64: user.publicKeyBase64,
            username: user.username,
        });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}

module.exports = { signUp, signIn, logout, updateProfile, getPublicKey };
