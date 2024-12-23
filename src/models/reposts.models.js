import mongoose from "mongoose";

const repostSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: [true, "Post is required!"],
        },
        reposter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Reposter is required!"],
        },
        editedVal: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Repost", repostSchema, 'reposts');