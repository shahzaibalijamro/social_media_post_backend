import express from "express";
import { addComment, addPost, allPosts, likePost } from "../controllers/posts.controllers.js";
import { upload } from "../middlewares/multer.middelware.js";

const postRouter = express.Router();

//add post
postRouter.post("/addpost",upload.single("image"), addPost)

//get all posts
postRouter.get("/posts", allPosts)

//like post
postRouter.post("/likepost", likePost)

//comment on a post
postRouter.post("/comment", addComment)

export { postRouter }