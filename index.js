import express from "express";
import authRoute from "./routes/auth.js"
import eventRoute from "./routes/event.js"
import projectRoute from "./routes/project.js"
import reviewRoute from "./routes/review.js"

const app = express();
app.use(express.json());

// Endpoint de login
app.use("/auth", authRoute);
app.use("/event", eventRoute);
app.use("/project", projectRoute);
app.use("/review", reviewRoute);

app.listen(3000, () => {
    console.log("Executando...")
});