import express from "express";
import authRoute from "./routes/auth.js"
import eventRoute from "./routes/event.js"

const app = express();
app.use(express.json());

// Endpoint de login
app.use("/auth", authRoute);
app.use("/event", eventRoute);

app.listen(3000, () => {
    console.log("Executando...")
});