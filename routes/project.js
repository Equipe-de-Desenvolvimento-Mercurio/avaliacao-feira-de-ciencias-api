import express from "express";
import pool from "../config/db.js"

const router = express.Router();

// {
//     "id_evento": 1
//     "nome_projeto" : "Projeto 1",
//     "resumo" : "Lorem Ipsum",
//     "estande" : 12
// }

router.post("/", async (req, res) => {
    let {id_evento, nome_projeto, resumo, estande} = req.body;

    if (!id_evento || !nome_projeto || !resumo || !estande){
        return res.status(400).json({
            error: "Informações invalidas"
        })
    }

    let evento = await pool.query("SELECT * FROM evento WHERE id_evento = $1", [id_evento]);

    if (evento.rowCount == 0){
        return res.status(404).json({
            error: "Evento Não encontrado"
        })
    }

    pool.query("INSERT INTO projeto (id_evento, nome_projeto, resumo, estande) values ($1, $2, $3, $4)", [id_evento, nome_projeto, resumo, estande]);

    return res.status(200).json({
        message: "Projeto criado com sucesso!!"
    });
})

export default router;