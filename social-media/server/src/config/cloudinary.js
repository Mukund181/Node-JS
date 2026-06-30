const cloudinary = require("cloudinary").v2;

function configCloudinary(){
    try {
        cloudinary.config({
            cloud_name : process.env.CLOUDINARY_CLOUD_NAME,
            api_key : process.env.CLOUDINARY_API_KEY,
            api_secret : process.env.CLOUDINARY_API_SECRET
        });
        console.log("Cloudinary configured successfully");
    } catch (error) {
        console.log("Cloudinary configuration error:", error);
    }
}

module.exports = configCloudinary;