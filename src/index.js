import dotenv from "dotenv";
dotenv.config();
import connectDB from "./db/index.js";
connectDB();
/*
import express from 'express'
const app=express();
(async()=>{
    try{
        mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error",(error)=>{console.log("Error",error);
            throw error;
        })
        app.listen(process.env.PORT,()=>{
            console.log(`Server Running On : ${process.env.PORT} `);
        })
    }catch(error){
        console.log("Error--->",error);
    }
})()
    */
