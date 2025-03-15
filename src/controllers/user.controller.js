import { User } from "../models/user.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { asyncHandler } from "../utils/asynchandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";

const registerUser = asyncHandler(async (req, res) => {
  const { username, email, fullname, avatar, password } = req.body;
  console.log(email);
  // if(fullname==="" && username==="" && email==="" && avatar==="" && password===""){
  //     throw new ApiError(400,"Fullname is required")
  // }   or use This
  if (
    [username, email, fullname, avatar, password].some(
      (field) => field?.trim() === ""
    )
  ) {
    throw new ApiError(400, "All Field are required");
  }
  const existedUser = User.findOne({ $or: [{ username }, { email }] });
  if (existedUser) {
    throw new ApiError(409, "User Already Exited ");
  }
  const avatarLoacalPath = req.files?.avatar[0]?.path;
  const coverImagePath = req.files?.coverImage[0]?.path;
  if (!avatarLoacalPath) {
    throw new ApiError(400, "Avatar File is Required");
  }
  const avatarUploadOnCludinary = await uploadOnCloudinary(avatarLoacalPath);
  const coverImageUploadOnCludinary = await uploadOnCloudinary(coverImagePath);
  if (!avatar) {
    throw new ApiError(400, "Avatar File is Required");
  }
  await User.create({
    fullname,
    avatarUploadOnCludinary: avatar.url,
    coverImageUploadOnCludinary: coverImageUploadOnCludinary?.url || "",
    password,
    username:username.toLowerCase()
  });
const createdUser=  await User.findById(username._id).select("-password -refreshToken")
     if(!createdUser){
      throw new ApiError(500,"something went Wrong")
     }
  return res.status(201).json(
    new ApiResponse(200,createdUser,"User Created Successfuly")
  )
});

export { registerUser };
