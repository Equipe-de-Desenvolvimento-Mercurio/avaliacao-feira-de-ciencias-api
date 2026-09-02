import express from "express";
import pool from "../config/db.js"

const router = express.Router();

router.post("/", async (req, res) => {
    const { id_avaliador, id_projeto, notas, comentario } = req.body;

    if (!id_avaliador || !id_projeto || !Array.isArray(notas) || notas.length !== 6) {
        return res.status(400).json({
            error: "Informe o avaliador, o projeto e exatamente 6 notas"
        });
    }

    const notasNumericas = notas.map(Number);
    if (notasNumericas.some((nota) => !Number.isFinite(nota) || nota < 0 || nota > 10)) {
        return res.status(400).json({
            error: "As notas devem ser números entre 0 e 10"
        });
    }

    const avaliador = await pool.query(
        "SELECT tipo_usuario, tipo_avaliador FROM usuario WHERE id_usuario = $1",
        [id_avaliador]
    );
    if (avaliador.rowCount === 0 || avaliador.rows[0].tipo_usuario !== "professor" || !avaliador.rows[0].tipo_avaliador) {
        return res.status(404).json({
            error: "Professor avaliador não encontrado"
        });
    }

    const projeto = await pool.query(
        "SELECT 1 FROM projeto WHERE id_projeto = $1",
        [id_projeto]
    );
    if (projeto.rowCount === 0) {
        return res.status(404).json({
            error: "Projeto não encontrado"
        });
    }

    const avaliacaoExistente = await pool.query(
        "SELECT 1 FROM avaliacao WHERE id_avaliador = $1 AND id_projeto = $2",
        [id_avaliador, id_projeto]
    );
    if (avaliacaoExistente.rowCount > 0) {
        return res.status(409).json({
            error: "Este projeto já foi avaliado por este usuário"
        });
    }

    const media = notasNumericas.reduce((total, nota) => total + nota, 0) / notasNumericas.length;

    await pool.query(
        "INSERT INTO avaliacao (id_avaliador, id_projeto, nota1, nota2, nota3, nota4, nota5, nota6, nota_media, comentario) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [id_avaliador, id_projeto, ...notasNumericas, media, comentario || null]
    );

    return res.status(201).json({
        message: "Projeto avaliado com sucesso!!"
    });
});

export default router;