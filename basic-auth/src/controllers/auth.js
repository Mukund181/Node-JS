const userModel = require("../models/user.js")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcrypt")

async function signUp(req,res){
    const data = req.body
    const isUser = await userModel.findOne({email: data.email})
    if(isUser){
        res.json({
            msg : "User already exists"
        })
    }
    else {
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
        if (!passwordRegex.test(data.password)) {
            return res.status(400).json({
                msg: "Password must be at least 8 characters and contain at least one uppercase letter, one number, and one special character"
            });
        }
        const hash = await bcrypt.hash(data.password, 10)
        const user = await userModel.create({
            username : data.username,
            email : data.email,
            password : hash,
            role : data.role
        })
        const token = jwt.sign({
            id : user._id
        },process.env.JWT_SECRET,{
            expiresIn : "10d"
        })
        res.cookie("token",token)
        res.json({
            msg : "User registered sucessfully",
            user : user.username
        })
    }
}

async function signIn(req,res){
    const data = req.body;
    const user = await userModel.findOne({email : data.email});
    if(!user){
        res.json({
            msg : "User not found"
        })
    }
    else {
        if(await bcrypt.compare(data.password,user.password)){
            const token = jwt.sign({
                id : user._id
            },process.env.JWT_SECRET,
                {
                    expiresIn : "10d"
        })
        res.cookie("token",token)
        res.json({
            msg : "User signed in sucessfully",
            user : user
        })
        }
    }
}

module.exports = {signUp,signIn}