import mongoose from "mongoose";
import User from "../models/users.models.js";
import Post from "../models/posts.models.js";
import { uploadImageToCloudinary } from "../utils/cloudinary.utils.js";

const addPost = async (req, res) => {
    try {
        const { content, poster } = req.body;
        const mediaPath = req.file ? req.file.path : null;
        if (!content && !mediaPath) {
            return res.status(400).json({ message: "Post must contain either text or media!" });
        }
        if (!poster || !mongoose.Types.ObjectId.isValid(poster)) {
            return res.status(400).json({
                message: "Invalid poster ID",
                status: 400
            })
        }
        const user = await User.findById(poster);
        if (!user) return res.status(400).json({
            message: "User not found!"
        })
        const media = null;
        if (mediaPath) {
            media = await uploadImageToCloudinary(mediaPath)
        }
        const newPost = await Post.create({ 
            content : content || "", 
            poster, 
            media })
        const updateUser = await User.findByIdAndUpdate(poster, {
            $push: { posts: newPost._id }
        })
        res.status(201).json({
            message: "Post uploaded!",
            post : newPost
        })
    } catch (error) {
        res.status(500).json({
            message: "An error occurred while adding the blog",
            error: error.message,
        })
    }
}


const allPosts = async (req,res) => {
    try {
        const allPosts = await Post.find({})
        res.json(allPosts)
    } catch (error) {
        res.json(error)
    }
}

export { addPost, allPosts}