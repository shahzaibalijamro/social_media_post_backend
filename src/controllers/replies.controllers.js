import mongoose from "mongoose";
import Reply from "../models/replies.models.js";
const replyToAComment = async (req, res) => {
    const { reply, comment, replier } = req.body;
    if (!reply) {
        return res.status(400).json({
            message: "Reply message must not be empty!",
        });
    }
    if (!comment || !mongoose.Types.ObjectId.isValid(comment)) {
        return res.status(400).json({
            message: "Comment ID is required and must be valid!",
        });
    }
    if (!replier || !mongoose.Types.ObjectId.isValid(replier)) {
        return res.status(400).json({
            message: "Replier's user ID is required and must be valid!",
        });
    }
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        const createdReply = await Reply.create(
            [{ comment, reply, replier }],
            { session }
        );
        const updatedComment = await Comment.findByIdAndUpdate(
            comment,
            { $push: { replies: createdReply[0]._id } },
            { session }
        );
        if (!createdReply || !updatedComment) {
            await session.abortTransaction();
            return res.status(500).json({
                message: "An error occurred while adding the reply!",
            });
        }
        await session.commitTransaction();
        return res.status(201).json({
            message: "Reply added successfully.",
            reply: createdReply[0],
        });
    } catch (error) {
        if (session) await session.abortTransaction();
        console.error("Error in replyToAComment:", error);
        return res.status(500).json({
            message: "Could not post the reply. Please try again later.",
        });
    } finally {
        if (session) await session.endSession();
    }
};

const deleteReply = async (req,res) =>{
    const {replyId,userId} = req.body;
    try {
        if (!replyId || !mongoose.Types.ObjectId.isValid(replyId)) {
            return res.status(400).json({
                message: "Reply Id is required and must be valid!"
            })
        }
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "User Id is required and must be valid!"
            })
        }
        const reply = await Reply.findById(replyId);
        if (!reply) {
            return res.status(404).json({
                message: "Reply not found!"
            })
        }
        if (reply.replier.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "You are not authorized to delete this reply!"
            })
        }
        const deleteReply = await Reply.findByIdAndDelete(replyId);
        return res.status(200).json({
            message: "Reply deleted!",
            deleteReply
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong while deleting the reply!"
        })
    }
}

export {replyToAComment,deleteReply}