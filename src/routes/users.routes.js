import express from "express"
import { checkTokenExpiration, loginUser, logoutUser, refreshUser, registerUser,resetPassword,updateUserData } from "../controllers/users.controllers.js";
import { upload } from "../middlewares/multer.middelware.js";

const userRouter = express.Router();

//register User
userRouter.post("/register", upload.single("image"), registerUser)

//login User
userRouter.post("/login", loginUser)

//logout User
userRouter.post("/logout", logoutUser)

//update User
userRouter.post("/update", updateUserData)

//give new tokens
userRouter.get("/refresh", refreshUser)

//check if the token is expired or not
userRouter.post("/check", checkTokenExpiration)

//reset Password
userRouter.post("/reset", resetPassword)

export { userRouter }