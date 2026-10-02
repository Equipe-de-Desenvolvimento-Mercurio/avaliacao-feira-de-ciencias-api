import express from "express";
import cors from "cors";
import authRoute from "./routes/auth.js"
import eventRoute from "./routes/event.js"
import projectRoute from "./routes/project.js"
import reviewRoute from "./routes/review.js"
import teacherRoute from "./routes/teacher.js"
import criteriosRoute from "./routes/criterios.js"
import rankingRoute from "./routes/ranking.js"
import categoriaRoute from "./routes/categoria.js"
import assignmentRoute from "./routes/assignment.js"
import { prepararBanco } from "./config/db.js";

const app = express();
// O navegador envia o Origin sem barra final; localhost/127.0.0.1 em qualquer porta liberam o desenvolvimento local.
const origensPermitidas = [
    "https://avaliacao-feira-de-ciencias-front-k72idnzez-ruygoesdev.vercel.app",
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
];

app.use(cors({
    origin: origensPermitidas,
    credentials: true
}));


app.use(express.json());

// Endpoint de login
app.use("/auth", authRoute);
app.use("/event", eventRoute);
app.use("/project", projectRoute);
app.use("/review", reviewRoute);
app.use("/teacher", teacherRoute);
app.use("/criterios", criteriosRoute);
app.use("/ranking", rankingRoute);
app.use("/categoria", categoriaRoute);
app.use("/assignment", assignmentRoute);

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