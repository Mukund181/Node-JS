// server/src/middleware/auth.js
// TODO: Implement your Express JWT auth verification middleware here.

const jwt = require("jsonwebtoken");
const userModel = require("../models/user");

async function authorizeUser(req,res,next){
    try {
        const token = req.cookies.token;
        if(!token){
            return res.status(401).json({message:"Unauthorized"})
        }
        const verfiyToken = jwt.verify(token,process.env.JWT_SECRET);
        const user = await userModel.findById(verfiyToken.id);
        if(!user){
            return res.status(404).json({message:"User not found"})
        }
        req.user = user;
        next();
    } catch (error) {
        console.log(error);
        return res.status(500).json({message:"Internal Server Error"})
    }
}

module.exports = authorizeUser;