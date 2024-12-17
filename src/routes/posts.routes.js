import express from "express";
import { addPost, allPosts } from "../controllers/posts.controllers.js";
import { upload } from "../middlewares/multer.middelware.js";

const postRouter = express.Router();

//add post
postRouter.post("/addpost",upload.single("image"), addPost)

//get all posts
postRouter.get("/posts", allPosts)

export { postRouter }