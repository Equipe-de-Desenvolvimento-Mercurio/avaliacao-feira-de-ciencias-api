import express from "express";
import pool from "../config/db.js"

const router = express.Router();

router.get("/:id_evento", async (req, res) => {
    let id_evento = req.params.id_evento
    let evento = await pool.query("SELECT * FROM evento WHERE id_evento = $1", [id_evento]);

    if (evento.rowCount == 0){
        return res.status(404).json({
            error: "Evento Não Encontrado!!"
        });
    }

    let participacao_evento = await pool.query("SELECT id_usuario FROM participacao_evento WHERE id_evento = $1", [id_evento]);

    if (participacao_evento.rowCount == 0){
        return res.status(404).json({
            error: "Sem professores nesse evento"
        });
    }

    for (let i of participacao_evento.rows){
        let num = i.id_usuario;

        const prof = pool.query("SELECT ")
    }

    res.send("ok");
});

export default router;