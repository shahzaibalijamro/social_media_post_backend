import mongoose from "mongoose";
import User from "../models/users.models.js";
import Blog from "../models/blogs.models.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { uploadImageToCloudinary } from "../utils/cloudinary.utils.js";
import { generateAccessandRefreshTokens } from "../utils/tokens.utils.js";

// registers User
const registerUser = async (req, res) => {
    const { userName, fullName, email, password } = req.body;
    if (!req.file) return res.status(400).json({
        message: "No file found"
    })
    const image = req.file.path;
    try {
        const profilePicture = await uploadImageToCloudinary(image)
        const user = new User({ userName, fullName, email, password, profilePicture })
        const { accessToken, refreshToken } = generateAccessandRefreshTokens(user)
        await user.save();
        res
            .cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 })
            .status(201).json({
                message: "New user created",
                newUser: {
                    userName: user.userName,
                    fullName: user.fullName,
                    profilePicture: user.profilePicture,
                    email: user.email,
                    _id: user._id
                },
                tokens: {
                    accessToken
                }
            })
    } catch (error) {
        console.log(error.message);
        if (error.message === "Password does not meet the required criteria") {
            return res.status(400).json({ message: "Password does not meet the required criteria!" });
        }
        if (error.code === 11000) {
            return res.status(400).json({ message: "userName or email already exists." });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        res.status(500).json({ message: 'Server error' });
    }
}

const followUser = async (req, res) => {
    const { currentUserId, targetUserId } = req.body;
    let session;
    try {
        if (!currentUserId || !mongoose.Types.ObjectId.isValid(currentUserId)) {
            return res.status(400).json({
                message: "User Id is required and must be valid!"
            })
        }
        if (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId)) {
            return res.status(400).json({
                message: "Targeted User Id is required and must be valid!"
            })
        };
        session = await mongoose.startSession();
        session.startTransaction();
        const [currentUser, targetUser] = await Promise.all([
            User.findById(currentUserId, { session }),
            User.findById(targetUserId, { session })
        ]);
        if (!currentUser || !targetUser) {
            await session.abortTransaction()
            return res.status(404).json({
                message: "One or both users not found!"
            })
        }
        if (currentUser.following.includes(targetUserId) || targetUser.followers.includes(currentUserId)) {
            const filterFollowing = currentUser.following.filter((item) => item.toString() !== targetUserId.toString());
            const filterFollowers = targetUser.followers.filter((item) => item.toString() !== currentUserId.toString());
            currentUser.following = filterFollowing;
            targetUser.followers = filterFollowers;
            await Promise.all([
                currentUser.save({ session }),
                targetUser.save({ session })
            ]);
            await session.commitTransaction()
            res.status(200).json({
                message: "Unfollowed successfully!"
            })
        }
        currentUser.following.push(targetUserId)
        targetUser.followers.push(currentUserId)
        await Promise.all([
            currentUser.save({ session }),
            targetUser.save({ session })
        ]);
        await session.commitTransaction()
        res.status(200).json({
            message: "Followed successfully!"
        })
    } catch (error) {
        console.log(error);
        if (session) await session.abortTransaction();
        res.status(500).json({
            message: "Something went wrong while following!"
        })
    } finally {
        if (session) await session.endSession()
    }
}

const loginUser = async function (req, res) {
    const { userNameOrEmail, password } = req.body;
    try {
        if (!userNameOrEmail || !password) {
            return res.status(400).json({ message: "Username, email, and password are required!" });
        }
        const user = await User.findOne({
            $or: [{ email: userNameOrEmail }, { userName: userNameOrEmail }]
        });
        if (!user) return res.status(404).json({
            message: "Invalid credentials"
        })
        const isPasswordCorrect = await bcrypt.compare(password, user.password)
        if (!isPasswordCorrect) return res.status(401).json({
            message: "Invalid credentials"
        })
        const { accessToken, refreshToken } = generateAccessandRefreshTokens(user)
        res
            .cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 })
            .status(200)
            .json({
                message: "User successfully logged in!",
                user: {
                    userName: user.userName,
                    fullname: user.fullName,
                    profilePicture: user.profilePicture,
                    email: user.email,
                    _id: user._id
                },
                tokens: {
                    accessToken
                }
            })
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "An error occurred during login" });
    }
}

const updateFullNameOrUserName = async (req, res) => {
    const { userName, fullName } = req.body;
    const decoded = req.user;
    const accessToken = req.tokens?.accessToken;
    try {
        if (!userName || !fullName) {
            return res.status(400).json({
                message: "Username and fullname are required!"
            })
        }
        const user = await User.findById(
            decoded._id || decoded.id).select('-password -publishedBlogs');
        if (!user) {
            return res.status(404).json({
                message: "User does not exist!"
            })
        }
        const lowerCaseUserName = userName.toLowerCase()
        if (user.userName !== lowerCaseUserName) {
            const isUserNameTaken = await User.findOne({ userName: lowerCaseUserName });
            if (isUserNameTaken) {
                return res.status(400).json({
                    message: "This username is already taken, try another one!",
                    taken: true
                })
            }
        }
        if (user.fullName !== fullName || user.userName !== lowerCaseUserName) {
            const update = await User.findByIdAndUpdate(
                user._id,
                {
                    fullName,
                    userName: lowerCaseUserName
                },
                { new: true }).select('-password -publishedBlogs');
            return res.status(200).json({
                message: "Username and fullname updated!",
                user: update,
                ...(accessToken && { accessToken })
            })
        }
        return res.status(200).json({
            message: "Username and fullname are already up-to-date!",
            user,
            ...(accessToken && { accessToken })
        })
    } catch (error) {
        console.log(error.message || error);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
}

const resetPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body.data;
        const decoded = req.user;
        const accessToken = req.tokens?.accessToken;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Insufficient data recieved!"
            })
        }
        const user = await User.findOne({ email: decoded.email })
        if (!user) return res.status(404).json({
            message: "User does not exist!"
        })
        const checkPassword = await bcrypt.compare(currentPassword, user.password);
        if (!checkPassword) return res.status(400).json({
            isPasswordCorrect: false,
            message: "Incorrect Password"
        })
        user.password = newPassword
        await user.save()
        res.status(200).json({
            isPasswordCorrect: true,
            message: "Password updated",
            ...(accessToken && { accessToken })
        })
    } catch (error) {
        console.log(error.message || error);
        if (error.message === "Password does not meet the required criteria") {
            return res.status(400).json({
                message: "Password does not meet the required criteria!"
            })
        }
        res.status(400).json({
            message: "Something went wrong"
        })
    }
}

const updateProfilePicture = async (req, res) => {
    const decoded = req.user;
    const accessToken = req.tokens?.accessToken;
    if (!req.file) return res.status(400).json({
        message: "No file found"
    })
    if (!decoded) return res.status(400).json({
        message: "No token found!"
    })
    const image = req.file.path;
    try {
        const doesUserExist = await User.findById(decoded._id || decoded.id);
        if (!doesUserExist) {
            res.status(404).json({
                message: "User does not exist!"
            })
        }
        const url = await uploadImageToCloudinary(image);
        if (!url) {
            return res.status(500).json({
                message: "Could not upload the image!"
            })
        }
        const updated = await User.findByIdAndUpdate(doesUserExist._id, { profilePicture: url }, { new: true }).select('-password -publishedBlogs')
        res.status(200).json({
            message: "Profile Picture updated!",
            user: updated,
            ...(accessToken && { accessToken })
        })
    } catch (error) {
        console.log(error, "==> this");
        return res.status(500).json({
            message: "Something went wrong!"
        })
    }
}

const deleteUser = async (req, res) => {
    const { refreshToken } = req.cookies;
    let session;
    try {
        if (!refreshToken) {
            return res.status(401).json({ message: "No refresh token provided" });
        }
        const decodedToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        session = await mongoose.startSession();
        session.startTransaction();
        const [deleteUser, deleteUserBlogs] = await Promise.all([
            User.findByIdAndDelete(decodedToken._id, { session }),
            Blog.deleteMany({ author: decodedToken._id }, { session })
        ])
        if (!deleteUser || !deleteUserBlogs) {
            await session.abortTransaction();
            return res.status(404).json({
                message: "User not found"
            })
        }
        await session.commitTransaction();
        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 0,
            sameSite: 'strict',
            path: '/',
        });
        return res.status(200).json({ message: "User deleted!" });
    } catch (error) {
        if (session) await session.abortTransaction()
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Invalid or expired token" });
        }
        console.log(error);
        return res.status(500).json({ message: "Error occurred while deleting the user" });
    } finally {
        if (session) await session.endSession()
    }
};


export { registerUser, loginUser, updateFullNameOrUserName, resetPassword, updateProfilePicture, deleteUser }