const mongoose = require("mongoose")

const mongodbURI = process.env.MONGODB_URI;
async function connectDB(){
        await mongoose.connect(mongodbURI);
        console.log("db connected");
}
module.exports = connectDB