import "../src/utils/config.js";
import "dotenv/config";  

import connectDB from "./db/index.js";
import app from "./app.js";

connectDB()
  .then(() => { 
    app.listen(process.env.PORT || 8000,()=>console.log("Server Running..."))
  })
  .catch(() => {
    console.log("Connection Failed");
  });
