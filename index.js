import dotenv from "dotenv"
dotenv.config()
import {app} from "./app.js"
import { userRouter } from "./src/routes/users.routes.js"
import { connectDB } from "./src/db/index.js"
import { postRouter } from "./src/routes/posts.routes.js"

app.use("/api/v1", postRouter)
app.use("/api/v1", userRouter)


connectDB()
.then(()=>{
    app.listen(process.env.PORT,() => {
        console.log("Server running on port ", process.env.PORT)
    })
})
.catch((err)=>{
    console.log("Something went wrong", err)
})