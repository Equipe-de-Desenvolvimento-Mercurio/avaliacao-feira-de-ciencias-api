import express from "express";
import pool from "../config/db.js"
import { validarToken } from "../services/security.js";

const router = express.Router();

router.post("/", validarToken, async (req, res) => {
    const { id_projeto, notas, comentario } = req.body;
    const id_avaliador = req.usuario.id_usuario;

    if (req.usuario.tipo_usuario !== "professor" || !id_projeto || !Array.isArray(notas) || notas.length !== 6) {
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
                `SELECT 1
         FROM projeto p
                 JOIN evento e ON e.id_evento = p.id_evento
         JOIN participacao_evento pe ON pe.id_evento = p.id_evento
                          AND pe.id_usuario = $1
                 WHERE p.id_projeto = $2
                     AND e.status = 'em_andamento'`,
        [id_avaliador, id_projeto]
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

    const pesos = {
        artistico: 1,
        tecnico: 3,
        convidado: 2
    };
    const tipoAvaliador = avaliador.rows[0].tipo_avaliador;
    const peso = pesos[tipoAvaliador];
    const somaNotas = notasNumericas.reduce((total, nota) => total + nota, 0);
    const pontuacaoTotal = somaNotas * peso;

    await pool.query(
        "INSERT INTO avaliacao (id_avaliador, id_projeto, nota1, nota2, nota3, nota4, nota5, nota6, nota_media, comentario) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)",
        [id_avaliador, id_projeto, ...notasNumericas, pontuacaoTotal, comentario || null]
    );

    return res.status(201).json({
        message: "Projeto avaliado com sucesso!!",
        soma_notas: somaNotas,
        peso,
        pontuacao_total: pontuacaoTotal
    });
});

export default router;