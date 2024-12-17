import mongoose from "mongoose";
import User from "../models/users.models.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { uploadImageToCloudinary } from "../utils/cloudinary.utils.js";
// generates tokens
const generateAccessandRefreshTokens = function (user) {
    const accessToken = jwt.sign({ _id: user._id, email: user.email }, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
    });
    const refreshToken = jwt.sign({ email: user.email, userName: user.userName, _id: user._id, }, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: "10d",
    });
    return { accessToken, refreshToken }
}



// registers User
const registerUser = async (req, res) => {

    //getting data
    const { userName, fullName, email, password } = req.body;
    if (!req.file) return res.status(400).json({
        message: "No file found"
    })
    const image = req.file.path;
    try {

        //uploading image to cloudinary and expecting the url in return
        const profilePicture = await uploadImageToCloudinary(image)

        //creating data instance
        const user = new User({ userName, fullName, email, password, profilePicture })

        //generating and adding the tokens midway through
        const { accessToken, refreshToken } = generateAccessandRefreshTokens(user)

        //saving the data
        await user.save();

        //sending response if user successfully created
        res

            //Adding cookies
            .cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 })

            //status code with json response
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
        //error checking
        if (error.code === 11000) {
            return res.status(400).json({ message: "userName or email already exists." });
        }
        if (error.name === 'ValidationError') {
            return res.status(400).json({ message: error.message });
        }
        console.log(error.message);
        if (error.message === "Password does not meet the required criteria") {
            return res.status(400).json({ message: "Your password must be at least 8 characters long, contain at least one letter, one number, and one special character (e.g., @$!%*?&)." });
        }
        res.status(500).json({ message: 'Server error' });
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


const logoutUser = async (req, res) => {
    try {
        const { refreshToken } = req.cookies;
        if (!refreshToken) return res.status(401).json({ message: "No refresh token provided" });
        const checkToken = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
        if (!checkToken) return res.status(401).json({
            message: "Invalid or expired token. Please log in again."
        })
        const user = await User.findOneAndUpdate({ email: checkToken.email }, { $set: { refreshToken: '' } }, { new: true })
        if (!user) return res.status(401).json({
            message: "User does not exist"
        })
        res.clearCookie("refreshToken", { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 0, sameSite: 'strict', });
        res.status(200).json({
            message: "User logged out successfully"
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Something went wrong. Please try again later." });
    }
}


//update user data

const updateUserData = async (req, res) => {
    console.log(req.cookies);
    const { refreshToken } = req.cookies;
    var decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
    console.log(decoded);
    res.send("done")
    // const { 
    // userName,
    // fullName,
    // profilePicture } = req.body;


}


//send user data upon reload

const refreshUser = async (req, res) => {
    try {
        const currentRefreshToken = req.cookies.refreshToken;
        if (!currentRefreshToken) {
            return res.status(401).json({ message: "Please login again!" });
        }
        // Decode and verify the token
        const decoded = jwt.verify(currentRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        const decodedId = decoded._id;
        const user = await User.findById(decodedId).select('-password -publishedBlogs -refreshToken');
        if (!user) return res.status(400).json({
            message: "User not found"
        })
        const { accessToken, refreshToken } = generateAccessandRefreshTokens(user)
        res
            .cookie("refreshToken", refreshToken, { httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 })
            .status(200)
            .json({
                message: "Token verified successfully!",
                accessToken,
                user
            })
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Refresh token has expired. Please login again!" });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: "Invalid refresh token. Please login again!" });
        }

        console.error(error);
        res.status(500).json({ message: "Internal server error!" });
    }
};

const checkTokenExpiration = async (req, res) => {
    console.log("hit");

    const accessToken = req.body.token.token;
    if (!accessToken) {
        console.log("No accessToken found");

        return res.status(400).json({
            message: 'Token not provided',
            isValid: false,
        });
    }
    try {
        const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        console.log("valid");

        res.status(200).json({
            isValid: true
        })
    } catch (error) {
        console.log("Invalid accessToken found");

        return res.status(400).json({
            isValid: false
        })
    }
}


const resetPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body.data;
        const authHeader = req.headers['authorization'];
        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                message: "Insufficient data recieved!"
            })
        }
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Authorization header missing or invalid' });
        }
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)
        if (!decoded) return res.status(400).json({
            message: "Invalid Access Token"
        })
        console.log(decoded);
        const user = await User.findOne({ email: decoded.email })
        if (!user) return res.status(400).json({
            message: "User does not exist!"
        })
        const checkPassword = await bcrypt.compare(currentPassword,user.password);
        if (!checkPassword) return res.status(400).json({
            isPasswordCorrect: false,
            message: "Incorrect Password"
        })
        user.password = newPassword
        await user.save()
        res.status(200).json({
            isPasswordCorrect: true,
            message: "Password updated"
        })
    } catch (error) {
        console.log(error);
        return res.status(400).json({
            message: "Something went wrong!",
            error: error.message || error
        })
    }
}

export { registerUser, loginUser, logoutUser, updateUserData, refreshUser, checkTokenExpiration, resetPassword }