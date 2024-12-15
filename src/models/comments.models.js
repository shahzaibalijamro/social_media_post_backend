import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: [true, "Post is required!"],
        },
        comment: {
            type: String,
            required: [true, "Comment text is required!"]
        },
        commenter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required!"],
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        replies: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Reply"
            }
        ]
    },
    {
        timestamps: true,
    }
);

// indexes
commentSchema.index({ post: 1 });
commentSchema.index({ commenter: 1 });

export default mongoose.model("Comment", commentSchema, 'comments');