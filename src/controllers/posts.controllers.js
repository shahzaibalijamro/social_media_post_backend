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
        let media = null;
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

const likePost = async (req,res) => {
    try {
        const {post,liker} = req.body;
        // Validate input
        if (!post || !mongoose.Types.ObjectId.isValid(post)) {
            return res.status(400).json({ message: "Post ID is required and must be valid." });
        }
        if (!liker || !mongoose.Types.ObjectId.isValid(liker)) {
            return res.status(400).json({ message: "Liker ID is required and must be valid." });
        }
        // Check if post exists
        const doesPostExist = await Post.findById(post);
        if (!doesPostExist) {
            return res.status(404).json({ message: "Post doesn't exist!" });
        }
        // Check if user exists
        const doesUserExist = await User.findById(liker);
        if (!doesUserExist) {
            return res.status(404).json({ message: "User doesn't exist!" });
        }
        try {
            const like = await Post.findByIdAndUpdate(post, {$push: {likes: {post,liker}}})
            const updateUserLikedPosts = await User.findByIdAndUpdate(liker, {$push: {likedPosts: {post,liker}}})
        } catch (error) {
            return res.status(400).json({
                message: error
            })
        }
        res.status(200).json({
            message: "Post liked!"
        })
    } catch (error) {
        res.json(error)
    }
}
export { addPost, allPosts}