import pool from "../config/db.js";

import express from "express";

const router = express.Router();


// {
//     "nome_evento":"SIC 2026",
//     "data_evento":"29-09-2026"
// }

// Pegar Eventos por email
router.get("/:id", async (req, res) => {
    let id = req.params.id;

    let id_events = await pool.query("SELECT (id_evento) FROM participacao_evento WHERE id_usuario = $1", [id]);

    if (id_events.rowCount == 0){
        return res.status(404).json({
            error: "Não tem eventos para esse usuario"
        });
    }

    let row = id_events.rows;
    let arr = [];
    for (let i = 0; i < row.length; i++){
        let data = pool.query("SELECT * FROM evento WHERE id_evento = $1", [row[i].id_evento]);
        arr.push((await data).rows[0])
    }
    return res.json(arr);

});

// Dentinar Evento para Professor
router.post("/usuario/:email", (req, res) => {
});

// Editar Eventos

// Liberar Evento

// Bloquear Evento


function verificarData(date){
        let arr = date.split("-");
        if (arr.length != 3){
            return false
        }
        console.log(arr);
        if (arr[2].length == 2 && arr[1].length == 2 && arr[0].length == 4) {
            return true;
        }
        return false;
    }

export default router;