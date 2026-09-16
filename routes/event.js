    import pool from "../config/db.js";

    import express from "express";
    import { validarToken, validarRoles } from "../services/security.js";

    const router = express.Router();

    const STATUS_EVENTOS = ["planejado", "em_andamento", "encerrado"];

    // Criar Evento
    router.post("/"     , async (req, res) => {
        const { nome_evento, data_evento, status = "planejado" } = req.body;

        if (!nome_evento || typeof nome_evento !== "string" || nome_evento.length > 150) {
            return res.status(400).json({
                error: "Nome do evento inválido"
            });
        }

        if (!verificarData(data_evento)) {
            return res.status(400).json({
                error: "Data do evento inválida. Use o formato YYYY-MM-DD"
            });
        }

        if (!STATUS_EVENTOS.includes(status)) {
            return res.status(400).json({
                error: "Status do evento inválido"
            });
        }

        const evento = await pool.query(
            "INSERT INTO evento (nome_evento, data_evento, status) VALUES ($1, $2, $3) RETURNING *",
            [nome_evento, data_evento, status]
        );

        return res.status(201).json(evento.rows[0]);
    });

    // Resumo do andamento das avaliações de um evento
    router.get("/:id_evento/dashboard", validarToken, validarRoles("coordenador"), async (req, res) => {
        const { id_evento } = req.  params;

        const resultado = await pool.query(
            `WITH avaliadores AS (
                 SELECT COUNT(DISTINCT pe.id_usuario)::int AS total
                 FROM participacao_evento pe
                 JOIN usuario u ON u.id_usuario = pe.id_usuario
                 WHERE pe.id_evento = $1
                   AND u.tipo_usuario = 'professor'
                   AND u.tipo_avaliador IS NOT NULL
             ), projetos AS (
                 SELECT
                     p.id_projeto,
                     p.nome_projeto,
                     p.resumo,
                     p.estande,
                     COUNT(DISTINCT a.id_avaliador)::int AS total_avaliaram,
                     COALESCE(SUM(a.nota_media), 0) AS pontuacao_total
                 FROM projeto p
                 LEFT JOIN avaliacao a ON a.id_projeto = p.id_projeto
                 WHERE p.id_evento = $1
                 GROUP BY p.id_projeto
             )
             SELECT
                 e.id_evento,
                 e.nome_evento,
                 e.data_evento,
                 e.status,
                 a.total AS total_avaliadores,
                 COUNT(p.id_projeto)::int AS total_projetos,
                 COUNT(p.id_projeto) FILTER (WHERE p.total_avaliaram > 0)::int AS projetos_avaliados,
                 COUNT(p.id_projeto) FILTER (WHERE p.total_avaliaram = 0)::int AS projetos_pendentes,
                 COALESCE(SUM(p.total_avaliaram), 0)::int AS total_avaliacoes,
                 (COUNT(p.id_projeto) * a.total)::int AS avaliacoes_esperadas,
                 COALESCE(
                     ROUND(
                         100.0 * SUM(p.total_avaliaram)
                         / NULLIF(COUNT(p.id_projeto) * a.total, 0),
                         1
                     ),
                     0
                 ) AS percentual_conclusao,
                 COALESCE(
                     json_agg(
                         json_build_object(
                             'id_projeto', p.id_projeto,
                             'nome_projeto', p.nome_projeto,
                             'resumo', p.resumo,
                             'estande', p.estande,
                             'pontuacao_total', p.pontuacao_total,
                             'total_avaliaram', p.total_avaliaram,
                             'total_avaliadores', a.total,
                             'percentual_conclusao', COALESCE(
                                 ROUND(100.0 * p.total_avaliaram / NULLIF(a.total, 0), 1),
                                 0
                             ),
                             'concluido', p.total_avaliaram >= a.total
                         ) ORDER BY p.pontuacao_total DESC, p.id_projeto
                     ) FILTER (WHERE p.id_projeto IS NOT NULL),
                     '[]'::json
                 ) AS projetos
             FROM evento e
             CROSS JOIN avaliadores a
             LEFT JOIN projetos p ON TRUE
             WHERE e.id_evento = $1
             GROUP BY e.id_evento, e.nome_evento, e.data_evento, e.status, a.total`,
            [id_evento]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                error: "Evento não encontrado"
            });
        }

        const [graficoResultado, atividadesResultado] = await Promise.all([
            pool.query(
                `SELECT
                     TO_CHAR(a.data_criacao::date, 'YYYY-MM-DD') AS data,
                     COUNT(*)::int AS avaliacoes
                 FROM avaliacao a
                 JOIN projeto p ON p.id_projeto = a.id_projeto
                 WHERE p.id_evento = $1
                 GROUP BY a.data_criacao::date
                 ORDER BY a.data_criacao::date`,
                [id_evento]
            ),
            pool.query(
                `SELECT
                     u.nome_usuario,
                     p.nome_projeto,
                     a.data_criacao AS data
                 FROM avaliacao a
                 JOIN usuario u ON u.id_usuario = a.id_avaliador
                 JOIN projeto p ON p.id_projeto = a.id_projeto
                 WHERE p.id_evento = $1
                 ORDER BY a.data_criacao DESC
                 LIMIT 10`,
                [id_evento]
            )
        ]);

        const dados = resultado.rows[0];
        const {
            id_evento: idEvento,
            nome_evento: nomeEvento,
            data_evento: dataEvento,
            status,
            total_avaliadores: totalAvaliadores,
            total_projetos: totalProjetos,
            projetos_avaliados: projetosAvaliados,
            projetos_pendentes: projetosPendentes,
            total_avaliacoes: totalAvaliacoes,
            avaliacoes_esperadas: avaliacoesEsperadas,
            percentual_conclusao: percentualConclusao,
            projetos
        } = dados;

        return res.status(200).json({
            evento: {
                id_evento: idEvento,
                nome_evento: nomeEvento,
                data_evento: dataEvento,
                status
            },
            resumo: {
                total_avaliadores: totalAvaliadores,
                total_projetos: totalProjetos,
                projetos_avaliados: projetosAvaliados,
                projetos_pendentes: projetosPendentes,
                total_avaliacoes: totalAvaliacoes,
                avaliacoes_esperadas: avaliacoesEsperadas,
                percentual_conclusao: percentualConclusao
            },
            projetos,
            grafico: graficoResultado.rows,
            atividades_recentes: atividadesResultado.rows.map((atividade) => ({
                tipo: "avaliacao",
                mensagem: `${atividade.nome_usuario} avaliou ${atividade.nome_projeto}`,
                data: atividade.data
            })),
            notificacoes: []
        });
    });

    // {
    //     "nome_evento":"SIC 2026",
    //     "data_evento":"29-09-2026"
    // }

    // Pegar Eventos por id
    router.get("/:id", validarToken, async (req, res) => {
        let id = req.params.id;

        if (String(req.usuario.id_usuario) !== String(id)) {
            return res.status(403).json({ error: "Acesso negado" });
        }

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


    function verificarData(date){
        if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return false;
        }

        const [year, month, day] = date.split("-").map(Number);
        const parsedDate = new Date(Date.UTC(year, month - 1, day));

        return parsedDate.getUTCFullYear() === year
            && parsedDate.getUTCMonth() === month - 1
            && parsedDate.getUTCDate() === day;
    }

    export default router;