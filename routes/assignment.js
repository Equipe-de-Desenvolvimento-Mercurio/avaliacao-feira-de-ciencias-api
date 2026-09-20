import express from "express";
import pool from "../config/db.js";
import { validarToken, validarRoles } from "../services/security.js";

const router = express.Router();

const apenasCoordenador = [validarToken, validarRoles("coordenador")];

router.post("/", ...apenasCoordenador, async (req, res) => {
    const { id_projeto, id_avaliador } = req.body;

    if (!id_projeto || !id_avaliador) {
        return res.status(400).json({
            error: "Informe o projeto e o avaliador"
        });
    }

    const projeto = await pool.query(
        "SELECT id_evento FROM projeto WHERE id_projeto = $1",
        [id_projeto]
    );
    if (projeto.rowCount === 0) {
        return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const avaliador = await pool.query(
        `SELECT u.id_usuario
         FROM usuario u
         JOIN participacao_evento pe ON pe.id_usuario = u.id_usuario
         WHERE u.id_usuario = $1
           AND u.tipo_usuario = 'professor'
           AND u.tipo_avaliador IS NOT NULL
           AND pe.id_evento = $2`,
        [id_avaliador, projeto.rows[0].id_evento]
    );
    if (avaliador.rowCount === 0) {
        return res.status(400).json({
            error: "O avaliador deve ser um professor vinculado ao evento do projeto"
        });
    }

    try {
        const atribuicao = await pool.query(
            `INSERT INTO atribuicao_projeto
                (id_projeto, id_avaliador, id_atribuido_por)
             VALUES ($1, $2, $3)
             RETURNING id_atribuicao, id_projeto, id_avaliador, id_atribuido_por, data_criacao`,
            [id_projeto, id_avaliador, req.usuario.id_usuario]
        );

        return res.status(201).json(atribuicao.rows[0]);
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                error: "Este avaliador já foi atribuído a este projeto"
            });
        }
        console.error("Erro ao criar atribuição:", error);
        return res.status(500).json({ error: "Não foi possível criar a atribuição" });
    }
});

router.delete("/:id_projeto/:id_avaliador", ...apenasCoordenador, async (req, res) => {
    const { id_projeto, id_avaliador } = req.params;
    const resultado = await pool.query(
        `DELETE FROM atribuicao_projeto
         WHERE id_projeto = $1 AND id_avaliador = $2`,
        [id_projeto, id_avaliador]
    );

    if (resultado.rowCount === 0) {
        return res.status(404).json({ error: "Atribuição não encontrada" });
    }

    return res.status(200).json({ message: "Atribuição removida com sucesso" });
});

router.get("/evento/:id_evento", ...apenasCoordenador, async (req, res) => {
    const { id_evento } = req.params;
    const atribuicoes = await pool.query(
        `SELECT
             ap.id_atribuicao,
             ap.id_projeto,
             p.nome_projeto,
             ap.id_avaliador,
             u.nome_usuario AS nome_avaliador,
             u.email AS email_avaliador,
             u.tipo_avaliador,
             ap.id_atribuido_por,
             ap.data_criacao
         FROM atribuicao_projeto ap
         JOIN projeto p ON p.id_projeto = ap.id_projeto
         JOIN usuario u ON u.id_usuario = ap.id_avaliador
         WHERE p.id_evento = $1
         ORDER BY ap.id_projeto, u.nome_usuario`,
        [id_evento]
    );

    return res.status(200).json(atribuicoes.rows);
});

export default router;