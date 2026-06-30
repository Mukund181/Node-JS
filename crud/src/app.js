const express = require("express")
require("dotenv").config()

const app = express();
app.use(express.json());
const noteModel= require("./models/notes")

app.post("/notes",async(req,res)=>{
    const data = req.body   // { title,description }
    console.log(data)
    await noteModel.create({
        title : data.title,
        description : data.description
    })
    res.status(201).json({
        msg : "Note Created"
    })
})

app.get("/notes/:title",async(req,res)=>{
    try {
        const title = req.params.title
        const notes = await noteModel.find({ title : title })
        res.status(200).json({
            msg : "Fetched sucessfully",
            notes : notes
        })
    }
    catch(error){
        console.log(res.status);
    }
})

app.delete("/notes/:id",async(req,res)=>{
     try {
        const id = req.params.id;
        await noteModel.findOneAndDelete({_id:id});
        res.json({
            msg : "Note deleted success"
        })
     }
     catch(error){
        console.log(res.status);
     }
})

app.patch("/notes/:id",async(req,res)=>{
    try {
        const id = req.params.id;
        const des = req.body.description;
        await noteModel.findByIdAndUpdate({_id : id},{description : des})
        res.json({
            msg : "Note updated sucessfully"
        })
    }
    catch(error){
        console.log(res.status);
    }
})

module.exports = app