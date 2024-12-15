import mongoose from "mongoose";

const shareSchema = new mongoose.Schema(
    {
        post: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Post",
            required: [true, "Post is required!"],
        },
        sharer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: [true, "Sharer is required!"],
        }
    },
    {
        timestamps: true,
    }
);

export default mongoose.model("Share", shareSchema, 'shares');