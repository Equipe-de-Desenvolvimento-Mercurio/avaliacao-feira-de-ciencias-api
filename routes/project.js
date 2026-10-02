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

const atualizarProjeto = async (req, res) => {
    const { id_projeto } = req.params;
    const { id_evento, id_categoria, nome_projeto, resumo, estande } = req.body;

    if (!id_evento || !id_categoria || !nome_projeto || !resumo || !estande) {
        return res.status(400).json({
            error: "Informe todos os dados do projeto"
        });
    }

    const projeto = await pool.query(
        "SELECT id_projeto FROM projeto WHERE id_projeto = $1",
        [id_projeto]
    );
    if (projeto.rowCount === 0) {
        return res.status(404).json({ error: "Projeto não encontrado" });
    }

    const evento = await pool.query(
        "SELECT 1 FROM evento WHERE id_evento = $1",
        [id_evento]
    );
    if (evento.rowCount === 0) {
        return res.status(404).json({ error: "Evento não encontrado" });
    }

    const categoria = await pool.query(
        "SELECT 1 FROM categoria WHERE id_categoria = $1",
        [id_categoria]
    );
    if (categoria.rowCount === 0) {
        return res.status(404).json({ error: "Categoria não encontrada" });
    }

    const avaliadoresIncompativeis = await pool.query(
        `SELECT 1
         FROM atribuicao_projeto ap
         WHERE ap.id_projeto = $1
           AND NOT EXISTS (
               SELECT 1
               FROM participacao_evento pe
               WHERE pe.id_usuario = ap.id_avaliador
                 AND pe.id_evento = $2
           )
         LIMIT 1`,
        [id_projeto, id_evento]
    );
    if (avaliadoresIncompativeis.rowCount > 0) {
        return res.status(409).json({
            error: "O projeto possui atribuições para avaliadores que não participam do novo evento"
        });
    }

    const resultado = await pool.query(
        `UPDATE projeto
         SET id_evento = $1,
             id_categoria = $2,
             nome_projeto = $3,
             resumo = $4,
             estande = $5
         WHERE id_projeto = $6
         RETURNING *`,
        [id_evento, id_categoria, nome_projeto, resumo, estande, id_projeto]
    );

    return res.status(200).json(resultado.rows[0]);
};

router.put("/:id_projeto", validarToken, validarRoles("coordenador"), atualizarProjeto);

router.delete("/:id_projeto", validarToken, validarRoles("coordenador"), async (req, res) => {
    const resultado = await pool.query(
        "DELETE FROM projeto WHERE id_projeto = $1",
        [req.params.id_projeto]
    ).catch((error) => ({ error }));

    if (resultado.error) {
        if (resultado.error.code === "23503") {
            return res.status(409).json({
                error: "Não é possível excluir um projeto que já possui avaliações"
            });
        }
        console.error("Erro ao excluir projeto:", resultado.error);
        return res.status(500).json({ error: "Não foi possível excluir o projeto" });
    }

    if (resultado.rowCount === 0) {
        return res.status(404).json({ error: "Projeto não encontrado" });
    }

    return res.status(200).json({ message: "Projeto excluído com sucesso" });
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
                    'indicacao', a.indicacao,
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

// Avaliadores do projeto: todos os atribuídos (avaliaram ou não) e quem
// avaliou mesmo tendo a atribuição removida depois
const consultaAvaliadoresProjeto = `
    SELECT
        u.id_usuario AS id_avaliador,
        u.nome_usuario AS nome_avaliador,
        u.email AS email_avaliador,
        u.tipo_avaliador,
        (ap.id_atribuicao IS NOT NULL) AS atribuido,
        ap.data_criacao AS data_atribuicao,
        (a.id_avaliacao IS NOT NULL) AS avaliou,
        CASE WHEN a.id_avaliacao IS NULL THEN NULL ELSE json_build_object(
            'id_avaliacao', a.id_avaliacao,
            'nota1', a.nota1,
            'nota2', a.nota2,
            'nota3', a.nota3,
            'nota4', a.nota4,
            'nota5', a.nota5,
            'nota6', a.nota6,
            'pontuacao_total', a.nota_media,
            'comentario', a.comentario,
            'indicacao', a.indicacao,
            'data_criacao', a.data_criacao
        ) END AS avaliacao
    FROM (
        SELECT id_avaliador FROM atribuicao_projeto WHERE id_projeto = $1
        UNION
        SELECT id_avaliador FROM avaliacao WHERE id_projeto = $1
    ) av
    JOIN usuario u ON u.id_usuario = av.id_avaliador
    LEFT JOIN atribuicao_projeto ap ON ap.id_projeto = $1 AND ap.id_avaliador = av.id_avaliador
    LEFT JOIN avaliacao a ON a.id_projeto = $1 AND a.id_avaliador = av.id_avaliador
    ORDER BY (a.id_avaliacao IS NOT NULL) DESC, u.nome_usuario`;

// Pegar um projeto pelo ID
router.get("/id/:id_projeto", validarToken, async (req, res) => {
    const filtroAtribuicao = req.usuario.tipo_usuario === "professor"
        ? "AND EXISTS (SELECT 1 FROM atribuicao_projeto ap WHERE ap.id_projeto = p.id_projeto AND ap.id_avaliador = $2)"
        : "";
    const parametros = req.usuario.tipo_usuario === "professor"
        ? [req.params.id_projeto, req.usuario.id_usuario]
        : [req.params.id_projeto];
    const projeto = await pool.query(
        `${consultaProjeto} WHERE p.id_projeto = $1 ${filtroAtribuicao}`,
        parametros
    ).then((result) => result.rows[0]);

    if (!projeto) {
        return res.status(404).json({
            error: "Projeto não encontrado"
        });
    }

    const avaliadores = await pool.query(consultaAvaliadoresProjeto, [projeto.id_projeto]);

    return res.status(200).json({
        ...projeto,
        avaliadores: avaliadores.rows,
        total_atribuidos: avaliadores.rows.filter((avaliador) => avaliador.atribuido).length,
        total_pendentes: avaliadores.rows.filter((avaliador) => avaliador.atribuido && !avaliador.avaliou).length
    });
});

// Pegar projetos relacionados a um evento
router.get("/:id_evento", validarToken, async (req, res) => {
    let id_evento = req.params.id_evento
    let { id_categoria } = req.query;

    let evento = await pool.query("SELECT * FROM evento WHERE id_evento = $1", [id_evento]);
    if (evento.rowCount == 0){
        return res.status(404).json({
            error: "Evento não encontrado!!"
        });
    }

    const filtroAtribuicao = req.usuario.tipo_usuario === "professor"
        ? "AND EXISTS (SELECT 1 FROM atribuicao_projeto ap WHERE ap.id_projeto = p.id_projeto AND ap.id_avaliador = $2)"
        : "";
    const parametrosBase = req.usuario.tipo_usuario === "professor"
        ? [id_evento, req.usuario.id_usuario]
        : [id_evento];
    let projects;
    if (id_categoria) {
        projects = await pool.query(
            `${consultaProjeto} WHERE p.id_evento = $1 AND p.id_categoria = $${req.usuario.tipo_usuario === "professor" ? 3 : 2} ${filtroAtribuicao} ORDER BY p.id_projeto`,
            [...parametrosBase, id_categoria]
        );
    } else {
        projects = await pool.query(
            `${consultaProjeto} WHERE p.id_evento = $1 ${filtroAtribuicao} ORDER BY p.id_projeto`,
            parametrosBase
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
                                     FROM atribuicao_projeto ap
                                     WHERE ap.id_projeto = p.id_projeto
                                         AND ap.id_avaliador = $2
                             )
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
                             AND EXISTS (
                                     SELECT 1
                                     FROM atribuicao_projeto ap
                                     WHERE ap.id_projeto = p.id_projeto
                                         AND ap.id_avaliador = $2
                             )
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