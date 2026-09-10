import express from "express";
import cors from "cors";
import authRoute from "./routes/auth.js"
import eventRoute from "./routes/event.js"
import projectRoute from "./routes/project.js"
import reviewRoute from "./routes/review.js"
import teacherRoute from "./routes/teacher.js"
import criteriosRoute from "./routes/criterios.js"
import { prepararBanco } from "./config/db.js";

const app = express();
app.use(cors({
    origin: "http://127.0.0.1:5500",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json());

// Endpoint de login
app.use("/auth", authRoute);
app.use("/event", eventRoute);
app.use("/project", projectRoute);
app.use("/review", reviewRoute);
app.use("/teacher", teacherRoute);
app.use("/criterios", criteriosRoute);

const iniciarServidor = async () => {
    try {
        await prepararBanco();

        app.listen(3000, () => {
            console.log("Executando...");
        });
    } catch (error) {
        console.error("Não foi possível preparar o banco:", error.message);
        process.exit(1);
    }
};

iniciarServidor();