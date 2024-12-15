import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, "Title is required!"],
        },
        description: {
            type: String,
            required: [true, "Description is required!"],
        },
        image: {
            type: String,
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
        ]
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Post", postSchema, 'posts');