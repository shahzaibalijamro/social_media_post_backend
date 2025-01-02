import mongoose from "mongoose";
import { uploadImageToCloudinary } from "../utils/cloudinary.utils.js";
import User from "../models/users.models.js";
import Post from "../models/posts.models.js";
import Like from "../models/likes.models.js";
import Share from "../models/shares.models.js";
import Repost from "../models/reposts.models.js";

const addPost = async (req, res) => {
    const { content, poster } = req.body;
    const mediaPath = req.file ? req.file.path : null;
    let session;
    try {
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
        session = await mongoose.startSession();
        session.startTransaction();
        const newPost = await Post.create({
            content: content || "",
            poster,
            media
        }, { session })
        const updateUser = await User.findByIdAndUpdate(poster, {
            $push: { posts: newPost._id }
        }, { session })
        if (!newPost || !updateUser) {
            await session.abortTransaction();
            return res.status(400).json({
                message: "An error occurred while creating the Post!"
            })
        }
        await session.commitTransaction();
        res.status(201).json({
            message: "Post uploaded!",
            post: newPost
        })
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.log(error.message || error);
        res.status(500).json({
            message: "An error occurred while adding the blog"
        })
    } finally {
        if (session) {
            await session.endSession();
        }
    }
}

//delete a post
const deletePost = async (req, res) => {
    const { postId, userId } = req.body;
    try {
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({
                message: "Post Id is required and must be valid"
            })
        }
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "User Id is required and must be valid"
            })
        }
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post doesn't exist"
            })
        }
        if (post.poster.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "You are not authorized to delete this post!"
            })
        }
        await post.remove();
        res.status(200).json({
            message: "Post deleted!"
        })
    } catch (error) {
        console.log(error.message || error);
        res.status(500).json({
            message: "Something went wrong while deleting the post!"
        })
    }
}

//all posts
const allPosts = async (req, res) => {
    try {
        const allPosts = await Post.find({})
        res.json(allPosts)
    } catch (error) {
        console.log(error.message || error);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
}

//single user posts
const getUserPosts = async (req, res) => {
    const {userId} = req.body;
    try {
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "User Id is required and must be valid!"
            })
        }
        const allPosts = await Post.find({poster: userId})
        if(!allPosts || allPosts.length === 0){
            return res.status(404).json({
                message: "No posts found for this user."
            })
        }
        res.json(allPosts)
    } catch (error) {
        console.log(error.message || error);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
}

//all shared posts
const getUserSharedPosts = async(req,res) => {
    const {userId} = req.body;
    try {
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "User Id is required and must be valid!"
            })
        }
        const findSharedPosts = await Share.find({sharer: userId}).populate("post");
        if(!findSharedPosts || findSharedPosts.length === 0){
            return res.status(404).json({
                message: "No shared posts found for this user."
            })
        }
        const sharedPosts = findSharedPosts.map(item => ({
            post: item.post,
            shareTimeStamp:{
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            },
            sharer: {
                _id: item.sharer._id,
                userName: item.sharer.userName,
                fullName: item.sharer.fullName,
                email: item.sharer.email,
                profilePicture: item.sharer.profilePicture,
            }
        }))
        res.json(sharedPosts)
    } catch (error) {
        console.log(error.message || error);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
}

//all shared posts
const getUserReposts = async(req,res) => {
    const {userId} = req.body;
    try {
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "User Id is required and must be valid!"
            })
        }
        const findSharedPosts = await Share.find({sharer: userId}).populate("post");
        if(!findSharedPosts || findSharedPosts.length === 0){
            return res.status(404).json({
                message: "No shared posts found for this user."
            })
        }
        const sharedPosts = findSharedPosts.map(item => ({
            post: item.post,
            shareTimeStamp:{
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
            }
        }))
        res.json(sharedPosts)
    } catch (error) {
        console.log(error.message || error);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
}

//edit post
const editPost = async (req, res) => {
    const { content, postId, userId } = req.body;
    const mediaPath = req.file ? req.file.path : null;
    try {
        if (!(content?.trim() || mediaPath)) {
            return res.status(400).json({ message: "Post must contain either text or media!" });
        }
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({
                message: "Post Id is required and must be valid!"
            })
        }
        if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({
                message: "User Id is required and must be valid!"
            })
        }
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post not found"
            })
        }
        if (post.poster.toString() !== userId.toString()) {
            return res.status(403).json({
                message: "You are not authorized to edit this post!"
            })
        }
        let media = post.media;
        if (mediaPath) {
            try {
                media = await uploadImageToCloudinary(mediaPath);
            } catch (error) {
                return res.status(500).json({ message: "Failed to upload media!" });
            }
        }
        post.content = content || post.content;
        post.media = media;
        await post.save();
        return res.status(200).json({
            message: "Post updated!",
            updatePost: post,
        })
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Something went wrong while editing the post!"
        })
    }
}

//like post using transactions
const likeOrUnlikePost = async (req, res) => {
    const { post, liker, likeId } = req.body;
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction()
        if (likeId && mongoose.Types.ObjectId.isValid(likeId)) {
            try {
                const [removeLikeFromPost, removeLikedPostFromUser, deleteLikedDocument] = await Promise.all([
                    Post.findByIdAndUpdate(post, { $pull: { likes: likeId } }, { session }),
                    User.findByIdAndUpdate(liker, { $pull: { likedPosts: likeId } }, { session }),
                    Like.findByIdAndDelete(likeId, { session })
                ])
                if (!deleteLikedDocument || !removeLikeFromPost || !removeLikedPostFromUser) {
                    await session.abortTransaction();
                    return res.status(400).json({
                        message: "An error occurred while Unliking the post!"
                    })
                }
                //commit transaction if successfully unliked
                await session.commitTransaction()
                return res.status(200).json({
                    message: "Unliked the post!",
                    removeLikeFromPost,
                    removeLikedPostFromUser,
                    deleteLikedDocument
                })
            } catch (error) {
                await session.abortTransaction();
                console.error(error);
                return res.status(500).json({
                    message: "Something went wrong while unliking the post!"
                });
            }
        }
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
        //create a like document
        const like = await Like.create([{ post, liker }], { session })
        //update post likes
        const [updatePostLikes, updateUserLikedPosts] = await Promise.all([
            Post.findByIdAndUpdate(post, { $push: { likes: like[0]._id } }, { new: true }, { session }),
            User.findByIdAndUpdate(liker, { $push: { likedPosts: like[0]._id } }, { session })
        ])
        //Check if all operations are successful
        if (!like || !updatePostLikes || updateUserLikedPosts) {
            //Abort the transaction incase of an error
            await session.abortTransaction()
            return res.status(400).json({ message: "Error occurred while processing your like request." });
        }
        // Commit the transaction after successful operations
        await session.commitTransaction();
        return res.status(200).json({
            updatePostLikes,
            message: "Post liked successfully"
        });
    } catch (error) {
        //abort the transaction if there's an error
        if (session) await session.abortTransaction();
        console.log(error.message || error);
        res.status(500).json({ message: "An error occurred" });
    } finally {
        //end the session regardless of success or failure
        if (session) await session.endSession()
    }
}

//share or unshare post
const shareOrUnSharePost = async (req, res) => {
    const { postId, userId, shareId } = req.body;
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({
            message: "Post Id is required and must be valid!"
        })
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            message: "User Id is required and must be valid!"
        })
    }
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        if (shareId && mongoose.Types.ObjectId.isValid(shareId)) {
            try {
                // unshare it
                const [updateUsersSharedPosts, updatePostsSharesCount, deleteShareDocument] = await Promise.all([
                    User.findByIdAndUpdate(userId, { $pull: { sharedPosts: shareId } }, { session }),
                    Post.findByIdAndUpdate(postId, { $pull: { shares: shareId } }, { session }),
                    Share.findByIdAndDelete(shareId, { session })
                ]);

                if (!updateUsersSharedPosts || !updatePostsSharesCount || !deleteShareDocument) {
                    await session.abortTransaction();
                    return res.status(500).json({
                        message: "Failed to unshare the post!"
                    });
                }

                await session.commitTransaction();
                return res.status(200).json({
                    message: "Unshared the post successfully!"
                });
            } catch (error) {
                await session.abortTransaction();
                console.error(error);
                return res.status(500).json({
                    message: "Something went wrong while unsharing the post!"
                });
            }
        }
        const [doesPostExist, doesUserExist] = await Promise.all([
            Post.findById(postId),
            User.findById(userId)
        ])
        if (!doesPostExist) return res.status(404).json({
            message: "Post does not exist!"
        })
        if (!doesUserExist) return res.status(404).json({
            message: "User does not exist!"
        })
        const createShare = await Share.create([{ post: postId, sharer: userId }], { session });
        const [updateUsersSharedPosts, updatePostsSharesCount] = await Promise.all([
            User.findByIdAndUpdate(userId, { $push: { sharedPosts: createShare[0]._id } }, { session }),
            Post.findByIdAndUpdate(postId, { $push: { shares: createShare[0]._id } }, { session })
        ])
        if (!createShare || !updateUsersSharedPosts || !updatePostsSharesCount) {
            await session.abortTransaction()
            return res.status(400).json({
                message: "Could not share post!"
            })
        }
        await session.commitTransaction();
        return res.status(200).json({
            message: "Shared post successfully!"
        })
    } catch (error) {
        if (session) {
            await session.abortTransaction()
        }
        console.log(error.message || error);
        res.status(500).json({
            message: "Something went wrong!"
        })
    } finally {
        if (session) {
            await session.endSession()
        }
    }
}

//repost or undo repost
const toggleRepost = async (req, res) => {
    const { postId, userId, editedVal, repostId } = req.body;
    if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
        return res.status(400).json({
            message: "Post Id is required and must be valid!"
        })
    }
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({
            message: "User Id is required and must be valid!"
        })
    }
    let session;
    try {
        session = await mongoose.startSession();
        session.startTransaction();
        if (repostId || mongoose.Types.ObjectId.isValid(repostId)) {
            try {
                const [updatePostsRepostCount, updateUsersReposts, deleteRepostDocument] = await Promise.all([
                    Post.findByIdAndUpdate(postId, { $pull: { reposts: repostId } }, { session }),
                    User.findByIdAndUpdate(userId, { $pull: { reposts: repostId } }, { session }),
                    Repost.findByIdAndDelete(repostId, { session })
                ])
                if (!updatePostsRepostCount || !updateUsersReposts || !deleteRepostDocument) {
                    await session.abortTransaction()
                    return res.status(400).json(
                        {
                            message: "Could not delete Repost!"
                        }
                    )
                }
                await session.commitTransaction();
                return res.status(200).json({
                    message: "Successfully deleted the repost!"
                })
            } catch (error) {
                await session.abortTransaction();
                console.error(error);
                return res.status(500).json({
                    message: "Something went wrong while undoing the repost!"
                });
            }
        }
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post does not exist!"
            })
        }
        const reposter = await Post.findById(userId);
        if (!reposter) {
            return res.status(404).json({
                message: "User does not exist!"
            })
        }
        const createRepost = await Repost.create([{ post: postId, reposter: userId, editedVal: editedVal || "" }], { session });
        const [updatePostsRepostCount, updateUsersReposts] = await Promise.all([
            Post.findByIdAndUpdate(postId, { $push: { reposts: createRepost[0]._id } }, { session }),
            User.findByIdAndUpdate(userId, { $push: { reposts: createRepost[0]._id } }, { session })
        ])
        if (!updatePostsRepostCount || !updateUsersReposts) {
            await session.abortTransaction()
            return res.status(400).json({
                message: "An error occurred while reposting!"
            })
        }
        await session.commitTransaction();
        res.status(200).json({
            message: "Successfully reposted!"
        })
    } catch (error) {
        if (session) {
            await session.abortTransaction();
        }
        console.log(error.message || error);
        return res.status(500).json({
            message: "Something went wrong"
        })
    } finally {
        if (session) {
            await session.endSession();
        }
    }
}

export { addPost, deletePost, allPosts, likeOrUnlikePost, shareOrUnSharePost, toggleRepost, editPost,getUserPosts,getUserSharedPosts }

// // // // // all reposts,
// all shared posts, done
// edit comment, done
// delete user, done
// delete reply, done
// edit post, done
// add comment, done
// delete comment, done
// add reply, done
// add like, done
// remove like, done
// add post, done
// all post, done
// delete post, done
// add repost, done
// delete repost, done
// share post, done
// unshare post, done
// register user, done
// login user, done
// logout user, done
// reset password,  done