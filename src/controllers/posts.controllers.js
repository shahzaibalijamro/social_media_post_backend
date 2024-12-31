import mongoose from "mongoose";
import { uploadImageToCloudinary } from "../utils/cloudinary.utils.js";
import User from "../models/users.models.js";
import Post from "../models/posts.models.js";
import Like from "../models/likes.models.js";
import Comment from "../models/comments.models.js";
import Share from "../models/shares.models.js"
import Repost from "../models/reposts.models.js"
import Reply from "../models/replies.models.js"
const addPost = async (req, res) => {
    let session;
    try {
        const { content, poster } = req.body;
        const mediaPath = req.file ? req.file.path : null;
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
        },{session})
        const updateUser = await User.findByIdAndUpdate(poster, {
            $push: { posts: newPost._id }
        },{session})
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
        await session.abortTransaction();
        console.log(error.message || error);
        res.status(500).json({
            message: "An error occurred while adding the blog"
        })
    }{
        await session.endSession();
    }
}

//delete a post
const deletePost = async (req, res) => {
    const {postId} = req.body;
    try {
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({
                message: "Post Id is required and must be valid"
            })
        }
        const post = await Post.findByIdAndDelete(postId);
        if (!post) {
            return res.status(404).json({
                message: "Post doesn't exist"
            })
        }
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
            message : "Something went wrong!"
        })
    }
}

//using transactions
const likePost = async (req, res) => {
    let session;
    try {
        const { post, liker,likeId } = req.body;
        // Validate input
        if (!post || !mongoose.Types.ObjectId.isValid(post)) {
            return res.status(400).json({ message: "Post ID is required and must be valid." });
        }
        if (!liker || !mongoose.Types.ObjectId.isValid(liker)) {
            return res.status(400).json({ message: "Liker ID is required and must be valid." });
        }
        session = await mongoose.startSession();
        session.startTransaction()
        if (likeId && mongoose.Types.ObjectId.isValid(likeId)) {
            const [removeLikeFromPost,removeLikedPostFromUser,deleteLikedDocument] = await Promise.all([
                Post.findByIdAndUpdate(post, { $pull: { likes: likeId } }, { session }),
                User.findByIdAndUpdate(liker, { $pull: { likedPosts: likeId } }, { session }),
                Like.findByIdAndDelete(likeId, { session })
            ])
            if (!deleteLikedDocument){
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
        const [updatePostLikes,updateUserLikedPosts] = await Promise.all([
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
    }finally{
        //end the session regardless of success or failure
        if (session) await session.endSession()
    }
}

//custom error handling
// const likePost = async (req, res) => {
//     try {
//         const { post, liker } = req.body;
//         // Validate input
//         if (!post || !mongoose.Types.ObjectId.isValid(post)) {
//             return res.status(400).json({ message: "Post ID is required and must be valid." });
//         }
//         if (!liker || !mongoose.Types.ObjectId.isValid(liker)) {
//             return res.status(400).json({ message: "Liker ID is required and must be valid." });
//         }
//         //check if the post is Liked Already
//         const checkIfLikedAlready = await Like.findOne({post: post,liker: liker});
//         //if the post has already been liked
//         if (checkIfLikedAlready) {
//             //unlike the post
//             const removeLikeFromPost = await Post.findByIdAndUpdate(post, { $pull: { likes: checkIfLikedAlready._id } })
//             const removeLikedPostFromUser = await User.findByIdAndUpdate(liker, { $pull: { likedPosts: checkIfLikedAlready._id } })
//             const deleteLikedDocument = await Like.findByIdAndDelete(checkIfLikedAlready._id)
//             return res.status(200).json({
//                 message : "Unliked the post!"
//             })
//         }
//         // Check if post exists
//         const doesPostExist = await Post.findById(post);
//         if (!doesPostExist) {
//             return res.status(404).json({ message: "Post doesn't exist!" });
//         }
//         // Check if user exists
//         const doesUserExist = await User.findById(liker);
//         if (!doesUserExist) {
//             return res.status(404).json({ message: "User doesn't exist!" });
//         }
//         //create like document
//         const like = await Like.create({ post, liker })
//         if (!like) return res.status(400).json({
//             error: "error"
//         })
//         //update the post's likes
//         const updatePostLikes = await Post.findByIdAndUpdate(post, { $push: { likes: like._id }},{ new: true })
//     //if failed delete the original like document
//     if (!updatePostLikes) {
//         const deleteLike = await Like.findByIdAndDelete(like._id);
//         return res.status(400).json({
//             error: "error occured first"
//         })
//     }
//     //update User's liked posts
//     const updateUserLikedPosts = await User.findByIdAndUpdate(liker, { $push: { likedPosts: like._id } });
//     //if failed undo the previous 2 operations
//     if (!updateUserLikedPosts) {
//         const deleteLike = await Like.findByIdAndDelete(like._id);
//         const deleteLikeFromPost = await Post.findByIdAndUpdate(post, { $pull: { likes: like._id } })
//         return res.status(400).json({
//             error: "error occured second"
//         })
//     }
//     res.status(200).json({
//         updatePostLikes,
//         message: "Post liked successfully"
//     });
// } catch (error) {
//     res.status(400).json(error)
// }}


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
        await session.abortTransaction();
        console.log(error.message || error);
        res.status(500).json({ message: "An error occurred" });
    }finally{
        await session.endSession()
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

const sharePost = async (req,res) => {
    const {postId,userId} = req.body;
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
        const checkIfSharedAlready = await Share.findOne({post: postId, sharer: userId})
        session = await mongoose.startSession();
        session.startTransaction();
        if (checkIfSharedAlready) {
            //unshare it
            const [updateUsersSharedPosts,updatePostsSharesCount,deleteShareDocument] = await Promise.all([
                User.findByIdAndUpdate(userId,{$pull: {sharedPosts: checkIfSharedAlready._id}},{session}),
                Post.findByIdAndUpdate(postId,{$pull: {shares: checkIfSharedAlready._id}},{session}),
                Share.findByIdAndDelete(checkIfSharedAlready._id,{session})
            ]);
            if (!updateUsersSharedPosts || !updatePostsSharesCount || !deleteShareDocument) {
                await session.abortTransaction();
                return res.status(500).json({
                    message: "Could not delete shared post!"
                })
            }
            await session.commitTransaction()
            return res.status(200).json({
                message: "Deleted the shared Post!"
            })
        }
        const [doesPostExist,doesUserExist] = await Promise.all([
            Post.findById(postId),
            User.findById(userId)
        ])
        if (!doesPostExist) return res.status(404).json({
            message: "Post does not exist!"
        })
        if (!doesUserExist) return res.status(404).json({
            message: "User does not exist!"
        })
        const createShare = await Share.create([{post: postId, sharer: userId}],{session});
        const [updateUsersSharedPosts,updatePostsSharesCount] = await Promise.all([
            User.findByIdAndUpdate(userId,{$push: {sharedPosts: createShare[0]._id}},{session}),
            Post.findByIdAndUpdate(postId,{$push: {shares: createShare[0]._id}},{session})
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
        await session.abortTransaction()
        console.log(error.message || error);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }finally{
        await session.endSession()
    }
}

const repost = async (req,res) => {
    const {postId,userId,editedVal} = req.body;
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
        const isAlreadyReposted = await Repost.find({post: postId,reposter: userId});
        session = await mongoose.startSession();
        session.startTransaction();
        if (isAlreadyReposted) {
            const [updatePostsRepostCount,updateUsersReposts,deleteRepostDocument] = await Promise.all([
                Post.findByIdAndUpdate(postId,{$pull: {reposts: isAlreadyReposted._id}},{session}),
                User.findByIdAndUpdate(userId,{$pull: {reposts: isAlreadyReposted._id}},{session}),
                Repost.findByIdAndDelete(isAlreadyReposted._id,{session})
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
        const createRepost = await Repost.create([{post: postId,reposter: userId,editedVal: editedVal || ""}],{session});
        const [updatePostsRepostCount,updateUsersReposts] = await Promise.all([
            Post.findByIdAndUpdate(postId,{$push: {reposts: createRepost[0]._id}},{session}),
            User.findByIdAndUpdate(userId,{$push: {reposts: createRepost[0]._id}},{session})
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
        await session.endSession()
        console.log(error.message || error);
        return res.status(500).json({
            message: "Something went wrong"
        })
    }
}

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

export { addPost,deletePost, allPosts, likePost,addComment,deleteComment,sharePost,repost,replyToAComment }

// // // // // delete reply,
// // // // // delete user,
// // // //    edit comment,
// // // // // all shared posts,
// // // // // edit post,
// // // // // all reposts,
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