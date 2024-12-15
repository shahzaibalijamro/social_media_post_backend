import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: [true, "Post is required!"],
        },
        liker: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Liker is required!"],
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Like", likeSchema, 'likes');