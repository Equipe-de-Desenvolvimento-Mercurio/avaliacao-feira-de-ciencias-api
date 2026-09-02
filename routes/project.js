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
});

// Pegar projetos relacionados a um evento
router.get("/:id_evento", async (req, res) => {
    let id_evento = req.params.id_evento

    let evento = await pool.query("SELECT * FROM evento WHERE id_evento = $1", [id_evento]);
    if (evento.rowCount == 0){
        return res.status(404).json({
            error: "Evento não encontrado!!"
        });
    }

    let projects = await pool.query("SELECT *FROM projeto WHERE id_evento = $1;", [id_evento]);
    if (projects.rowCount == 0){
        return res.status(404).json({
            error: "Não tem projetos para esse evento!!"
        });
    }

    return res.status(200).json(projects.rows)
});

// Pegar projetos avaliados pelo usuario
router.get("/:id_evento/:id_usuario/evaluated", async (req, res) => {
        const { id_evento, id_usuario } = req.params;

        const projects = await pool.query(
                `SELECT p.*
                 FROM projeto p
                 WHERE p.id_evento = $1
                     AND EXISTS (
                             SELECT 1
                             FROM avaliacao a
                             WHERE a.id_projeto = p.id_projeto
                                 AND a.id_avaliador = $2
                     )
                 ORDER BY p.id_projeto`,
                [id_evento, id_usuario]
        );

        return res.status(200).json(projects.rows);
});

// Pegar projetos não avaliados pelo usuario
router.get("/:id_evento/:id_usuario/not_evaluated", async (req, res) => {
        const { id_evento, id_usuario } = req.params;

        const projects = await pool.query(
                `SELECT p.*
                 FROM projeto p
                 WHERE p.id_evento = $1
                     AND NOT EXISTS (
                             SELECT 1
                             FROM avaliacao a
                             WHERE a.id_projeto = p.id_projeto
                                 AND a.id_avaliador = $2
                     )
                 ORDER BY p.id_projeto`,
                [id_evento, id_usuario]
        );

        return res.status(200).json(projects.rows);
});


export default router;