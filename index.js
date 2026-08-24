import express from "express";
import authRoute from "./routes/auth.js"

const app = express();
app.use(express.json());

// Endpoint de login
app.use("/auth", authRoute);

app.listen(3000, () => {
    console.log("Executando...")
});