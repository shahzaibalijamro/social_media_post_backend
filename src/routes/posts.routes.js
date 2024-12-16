import express from "express";
import { addPost, allPosts } from "../controllers/posts.controllers.js";

const postRouter = express.Router();

//add post
postRouter.post("/addpost", addPost)

//get all posts
postRouter.get("/posts", allPosts)

export { postRouter }