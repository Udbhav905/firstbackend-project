import "../utils/config.js";
import "dotenv/config";
import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong in generate access-refresh token"
    );
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, password } = req.body;

  if (
    [username, email, fullname, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User already exists");
  }

  const avatarLocalPath = req.files?.avatar[0]?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  let coverImage;
  if (req.files?.coverImage) {
    const coverImagePath = req.files.coverImage[0]?.path;
    coverImage = await uploadOnCloudinary(coverImagePath);
  }

  const user = await User.create({
    fullname,
    email,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;
  if (!username && !email) {
    throw new ApiError(400, "Username or Email is required");
  }
  const user = await User.findOne({ $or: [{ username }, { email }] });
  if (!user) {
    throw new ApiError(404, "User Not Exist");
  }
  const isPasswordValid = await user.isPassswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Password Is Incorrect");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );
  // console.log("----->",generateAccessAndRefereshTokens( user._id));
  const loggedinUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const option = {
    httpOnly: true,
    secure: true,
  };
  // console.log("acccessToken---->",accessToken);
  // console.log("refreshToken---->",refreshToken);
  return res
    .status(200)
    .cookie("accesstoken", accessToken, option)
    .cookie("refreshtoken", refreshToken, option)
    .json(
      new ApiResponse(
        200,
        { user: loggedinUser, accessToken, refreshToken },
        "user Logged In Successfully"
      )
    );
});
const logoutUser = asyncHandler(async (req, res) => {
  User.findByIdAndUpdate(
    req.user_id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );
  const option = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accesstoken", option)
    .clearCookie("refreshtoken", option)
    .json(new ApiResponse(200, "User Logout succesfully"));
});
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookie.refreshToken || req.body.refreshToken;
  try {
    if (!incomingRefreshToken) {
      throw new ApiError(401, "Unauthorized Request");
    }
    const decoadedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decoadedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid Refresh Token");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refreshToken is expired || Used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, newrefreshToken } =
      await generateAccessAndRefereshTokens(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken)
      .cookie("refreshToken", newrefreshToken)
      .json(
        new ApiError(
          200,
          { accessToken, refreshToken: newrefreshToken },
          "AccessToken Refreshes SuccessFullly"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message);
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword, confirmpassword } = req.body;
  const user = await User.find(req.user?._id);

  const isPasswordCorrect = user.isPassswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Invalid Old Password");
  }
  if (newPassword === confirmpassword) {
    throw new ApiError(400, "Not Match Both Password");
  }
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password Save Successfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(200, req.user, "current user fetched successfully");
});
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;
  if (!fullname || !email) {
    throw new ApiError(400, "All field Are Required");
  }
  User.findByIdAndUpdate(req.user?._id,
    {
      $set: {
        fullname,
        email: email,
      },
    },
    { new: true }
  ).select('-password')
  return res.status(200).json(new ApiResponse(200,user,"Account Updated Successfully"))
});

const updateUserAvatar=asyncHandler(async(req,res)=>{
  const avatarLocalPath=req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400,"Avatar File IS Not Uploaded")
  }
  const avatar=await uploadOnCloudinary(avatarLocalPath);
  if (!avatar.url) {
    throw new ApiError(400,"Error in Uploading avatar")
  }
 const user= await User.findByIdAndUpdate(req.user?._id,{
    $set:{
      avatar:avatar.url,
    
    }
  },{new:true}).select('-password')
  return res.status(200).json(new ApiResponse(200,"Avatar Change Successfully"))
})

const  updateUserCoverImage=asyncHandler(async(req,res)=>{
  const coverImageLocalpath=req.file?.path;
  if (!coverImageLocalpath) {
    throw new ApiError(400,"coverImage File IS Not Uploaded")
  }
  const coverImage=await uploadOnCloudinary(avatarLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400,"Error in Uploading avatar")
  }
  const user=await User.findByIdAndUpdate(req.user?._id,{
    $set:{
      coverImage:coverImage.url,
    
    }
  },{new:true}).select('-password')
});
export { registerUser, loginUser, logoutUser, refreshAccessToken ,updateUserAvatar, updateUserCoverImage};
