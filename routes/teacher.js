import express from "express";
import pool from "../config/db.js"

const router = express.Router();


// professores de um evento
router.get("/evento/:id_evento", async (req, res) => {
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
    let newArr = [];
    for (let u of participacao_evento.rows){
        let user = await pool.query("SELECT * FROM usuario WHERE id_usuario = $1 AND tipo_usuario = 'professor'", [u.id_usuario]);
        newArr.push(user.rows)
    }

    res.json(newArr);
});

router.get("/:id_evento/:id_usuario", async (req, res) => {
    const { id_evento, id_usuario } = req.params;

    const evento = await pool.query(
        "SELECT id_evento, nome_evento FROM evento WHERE id_evento = $1",
        [id_evento]
    );
    if (evento.rowCount === 0) {
        return res.status(404).json({
            error: "Evento não encontrado!!"
        });
    }

    const usuario = await pool.query(
        `SELECT id_usuario, nome_usuario, email, tipo_usuario, tipo_avaliador
         FROM usuario
         WHERE id_usuario = $1 AND tipo_usuario = 'professor'`,
        [id_usuario]
    );
    if (usuario.rowCount === 0) {
        return res.status(404).json({
            error: "Professor não encontrado!!"
        });
    }

    const projetos = await pool.query(
        `SELECT
             p.id_projeto,
             p.nome_projeto,
             p.resumo,
             p.estande,
             (a.id_avaliacao IS NOT NULL) AS avaliado,
             CASE WHEN a.id_avaliacao IS NOT NULL THEN json_build_object(
                 'id_avaliacao', a.id_avaliacao,
                 'nota1', a.nota1,
                 'nota2', a.nota2,
                 'nota3', a.nota3,
                 'nota4', a.nota4,
                 'nota5', a.nota5,
                 'nota6', a.nota6,
                 'nota_media', a.nota_media,
                 'comentario', a.comentario,
                 'data_criacao', a.data_criacao
             ) END AS avaliacao
         FROM projeto p
         LEFT JOIN avaliacao a
             ON a.id_projeto = p.id_projeto
            AND a.id_avaliador = $2
         WHERE p.id_evento = $1
         ORDER BY p.id_projeto`,
        [id_evento, id_usuario]
    );

    const avaliados = projetos.rows.filter((projeto) => projeto.avaliado);
    const media = avaliados.length > 0
        ? avaliados.reduce((total, projeto) => total + Number(projeto.avaliacao.nota_media), 0) / avaliados.length
        : null;

    return res.status(200).json({
        evento: evento.rows[0],
        usuario: usuario.rows[0],
        resumo: {
            total_projetos: projetos.rows.length,
            total_avaliados: avaliados.length,
            total_nao_avaliados: projetos.rows.length - avaliados.length,
            media_avaliacoes: media === null ? null : Number(media.toFixed(1))
        },
        projetos: projetos.rows
    });
});

export default router;