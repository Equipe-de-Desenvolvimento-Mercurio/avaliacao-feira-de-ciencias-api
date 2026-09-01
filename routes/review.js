import express from "express";
import pool from "../config/db.js"

const router = express.Router();

router.post("/", async (req, res) => {
    let { id_avaliador, id_projeto, notas, comentario} = req.body

    let media = await calcularMedia(notas, id_avaliador, res);

    let projeto = await pool.query("SELECT * FROM projeto WHERE id_projeto = $1", [id_projeto]);
    if (projeto.rowCount == 0){
        return res.status(404).json({
            error: "Projeto não encontrado"
        });
    }

    await pool.query(
        "INSERT INTO avaliacao (id_avaliador, id_projeto, nota1, nota2, nota3, nota4, nota5, nota6, nota_media, comentario) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
        [
            id_avaliador,
            id_projeto,
            notas["1"],
            notas["2"],
            notas["3"],
            notas["4"],
            notas["5"],
            notas["6"],
            media,
            comentario
        ]
    );

    return res.status(200).json({
        message: "Projeto Avaliado com sucesso!!"
    });

});

async function calcularMedia(notas, id_avaliador, res){
    let sum = 0
    notas.map((i) => {
        sum += i;
    });

    let tipoAvaliador = await pool.query("SELECT tipo_avaliador FROM usuario WHERE id_usuario = $1", [id_avaliador]);
    if (tipoAvaliador.rowCount == 0){
        return res.status(404).json({
            error: "Professor avaliador não encontrado"
        });
    }

    let tipo = tipoAvaliador.rows[0].tipo_avaliador;

    let pesos = {
        "artistico": 1,
        "tecnico": 3
    };

    return sum * pesos[tipo];

}

export default router;