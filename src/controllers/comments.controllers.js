import mongoose from "mongoose";
import Comment from "../models/comments.models.js";
//add comment
const addComment = async (req, res) => {
    let session;
    try {
        const { post, commenter, comment } = req.body;
        if (!post || !mongoose.Types.ObjectId.isValid(post)) {
            return res.status(400).json({ message: "Post ID is required and must be valid." });
        }
        if (!commenter || !mongoose.Types.ObjectId.isValid(commenter)) {
            return res.status(400).json({ message: "Commenter ID is required and must be valid." });
        }
        if (!comment) {
            return res.status(400).json({ message: "Comment content is required." });
        }
        const doesPostExist = await Post.findById(post);
        if (!doesPostExist) {
            return res.status(404).json({ message: "Post doesn't exist!" });
        }
        const doesUserExist = await User.findById(commenter);
        if (!doesUserExist) {
            return res.status(404).json({ message: "User doesn't exist!" });
        }
        session = await mongoose.startSession();
        session.startTransaction();
        const createComment = await Comment.create([{ post, comment, commenter }],{session});
        const updatePostComments = await Post.findByIdAndUpdate(post,{$push:{comments: createComment[0]._id}},{session});
        if (!createComment || !updatePostComments) {
            await session.abortTransaction();
            return res.status(400).json({ message: "An error occurred while adding the comment." });
        }
        await session.commitTransaction();
        res.status(201).json({
            message: "Comment added successfully",createComment
        });
    } catch (error) {
        if(session){
            await session.abortTransaction();
        }
        console.log(error.message || error);
        res.status(500).json({ message: "An error occurred" });
    }finally{
        if(session){
            await session.endSession()
        }
    }
}

const deleteComment = async (req,res) => {
    const {commentId} = req.body;
    try {
        if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({
                message : "Comment Id is required and must be valid!"
            })
        }
        const doesCommentExist = await Comment.findByIdAndDelete(commentId);
        if (!doesCommentExist) {
            return res.status(404).json({
                message: "Comment does not exist!"
            })
        }
        res.status(200).json({
            message : "Comment deleted successfully!"
        })
    } catch (error) {
        console.log(error.message || error);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
}

const editComment = async (req,res) => {
    const {commentText,commentId,userId} = req.body;
    try {
        if (!commentText || commentText.trim() === "") {
            return res.status(400).json({
                message: "Comment text cannot be empty!"
            });
        }
        if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
            return res.status(400).json({
                message: "Comment Id is required and must be valid!"
            })
        }
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "User Id is required and must be valid!"
            })
        }
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return res.status(404).json({
                message: "Comment does not exist!"
            })
        }
        if (comment.commenter.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "You are not authorized to edit this comment."
            })
        }
        comment.comment = commentText;
        await comment.save();
        return res.status(200).json({
            message: "Comment updated!"
        })
    } catch (error) {
        console.log(error.message || error);
        return res.status(500).json({
            message: "Something went wrong while editing the comment!"
        })
    }
}

export {addComment,editComment,deleteComment}