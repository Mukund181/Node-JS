const express = require("express")
const router = express.Router()

const {signUp,signIn} = require("../controllers/auth.js")
router.post("/signUp",signUp)

router.get("/signIn",signIn)
router.get("/test",(req,res)=>{
    console.log(req.cookies)
    res.json({msg:"Hello"})
})

module.exports = router