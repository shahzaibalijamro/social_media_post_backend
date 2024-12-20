import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        content: {
            type: String,
            default: ""
        },
        media: {
            type: String,
            default: null
        },
        poster: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Poster is required!"],
        },
        likes: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Like"
            }
        ],
        shares: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Share"
            }
        ],
        reposts: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Repost"
            }
        ],
        comments: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Comment"
            }
        ],
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Post", postSchema, 'posts');