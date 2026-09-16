import express from "express";
import pool from "../config/db.js"
import { validarToken, validarRoles } from "../services/security.js";

const router = express.Router();

// {
//     "id_evento": 1,
//     "id_categoria": 1,
//     "nome_projeto" : "Projeto 1",
//     "resumo" : "Lorem Ipsum",
//     "estande" : 12
// }

router.post("/", validarToken, validarRoles("coordenador"), async (req, res) => {
    let {id_evento, id_categoria, nome_projeto, resumo, estande} = req.body;

    if (!id_evento || !id_categoria || !nome_projeto || !resumo || !estande){
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

    let categoria = await pool.query("SELECT * FROM categoria WHERE id_categoria = $1", [id_categoria]);

    if (categoria.rowCount == 0){
        return res.status(404).json({
            error: "Categoria não encontrada"
        })
    }

    await pool.query("INSERT INTO projeto (id_evento, id_categoria, nome_projeto, resumo, estande) values ($1, $2, $3, $4, $5)", [id_evento, id_categoria, nome_projeto, resumo, estande]);

    return res.status(200).json({
        message: "Projeto criado com sucesso!!"
    });
});

const consultaProjeto = `
    SELECT
        p.*,
        c.nome_categoria,
        COALESCE((
            SELECT SUM(a.nota_media)
            FROM avaliacao a
            WHERE a.id_projeto = p.id_projeto
        ), 0) AS pontuacao_total,
        (
                        SELECT COUNT(DISTINCT pe.id_usuario)
            FROM participacao_evento pe
            JOIN usuario u ON u.id_usuario = pe.id_usuario
            WHERE pe.id_evento = p.id_evento
              AND u.tipo_usuario = 'professor'
                            AND u.tipo_avaliador IS NOT NULL
        ) AS total_avaliadores,
        (
            SELECT COUNT(DISTINCT a.id_avaliador)
            FROM avaliacao a
            WHERE a.id_projeto = p.id_projeto
        ) AS total_avaliaram,
        COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id_avaliacao', a.id_avaliacao,
                    'id_avaliador', a.id_avaliador,
                    'nota1', a.nota1,
                    'nota2', a.nota2,
                    'nota3', a.nota3,
                    'nota4', a.nota4,
                    'nota5', a.nota5,
                    'nota6', a.nota6,
                    'pontuacao_total', a.nota_media,
                    'comentario', a.comentario,
                    'data_criacao', a.data_criacao
                ) ORDER BY a.id_avaliacao
            )
            FROM avaliacao a
            WHERE a.id_projeto = p.id_projeto
        ), '[]'::json) AS avaliacoes
    FROM projeto p
    JOIN categoria c ON c.id_categoria = p.id_categoria`;

const buscarProjeto = async (idProjeto) => {
    const result = await pool.query(
        `${consultaProjeto} WHERE p.id_projeto = $1`,
        [idProjeto]
    );

    return result.rows[0];
};

// Pegar um projeto pelo ID
router.get("/id/:id_projeto", async (req, res) => {
    const projeto = await buscarProjeto(req.params.id_projeto);

    if (!projeto) {
        return res.status(404).json({
            error: "Projeto não encontrado"
        });
    }

    return res.status(200).json(projeto);
});

// Pegar projetos relacionados a um evento
router.get("/:id_evento", async (req, res) => {
    let id_evento = req.params.id_evento
    let { id_categoria } = req.query;

    let evento = await pool.query("SELECT * FROM evento WHERE id_evento = $1", [id_evento]);
    if (evento.rowCount == 0){
        return res.status(404).json({
            error: "Evento não encontrado!!"
        });
    }

    let projects;
    if (id_categoria) {
        projects = await pool.query(
            `${consultaProjeto} WHERE p.id_evento = $1 AND p.id_categoria = $2 ORDER BY p.id_projeto`,
            [id_evento, id_categoria]
        );
    } else {
        projects = await pool.query(
            `${consultaProjeto} WHERE p.id_evento = $1 ORDER BY p.id_projeto`,
            [id_evento]
        );
    }
    if (projects.rowCount == 0){
        return res.status(404).json({
            error: "Não tem projetos para esse evento!!"
        });
    }

    return res.status(200).json(projects.rows)
});

// Pegar projetos avaliados pelo usuario
router.get("/:id_evento/:id_usuario/evaluated", validarToken, async (req, res) => {
        const { id_evento, id_usuario } = req.params;

    if (String(req.usuario.id_usuario) !== String(id_usuario)) {
        return res.status(403).json({ error: "Acesso negado" });
    }

        const projects = await pool.query(
            `${consultaProjeto}
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
router.get("/:id_evento/:id_usuario/not_evaluated", validarToken, async (req, res) => {
        const { id_evento, id_usuario } = req.params;

    if (String(req.usuario.id_usuario) !== String(id_usuario)) {
        return res.status(403).json({ error: "Acesso negado" });
    }

        const projects = await pool.query(
            `${consultaProjeto}
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