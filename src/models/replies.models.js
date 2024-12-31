import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
    {
        comment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment",
            required: [true, "Comment is required!"],
        },
        reply: {
            type: String,
            required: [true, "Reply text is required!"]
        },
        replier: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "User is required!"],
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ]
    },
    {
        timestamps: true,
    }
);

replySchema.index({ comment: 1 });
replySchema.index({ replier: 1 });

export default mongoose.model("Reply", replySchema, 'replies');