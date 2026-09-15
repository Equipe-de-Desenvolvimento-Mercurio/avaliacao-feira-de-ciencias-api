import express from "express";
import pool from "../config/db.js";
import { validarToken } from "../services/security.js";

const router = express.Router();

// Ranking de todos os projetos de um evento
router.get("/:id_evento", validarToken, async (req, res) => {
	const { id_evento } = req.params;

	if (!/^\d+$/.test(id_evento)) {
		return res.status(400).json({
			error: "ID do evento inválido"
		});
	}

	try {
		const evento = await pool.query(
			"SELECT id_evento, nome_evento FROM evento WHERE id_evento = $1",
			[id_evento]
		);

		if (evento.rowCount === 0) {
			return res.status(404).json({
				error: "Evento não encontrado"
			});
		}

		const ranking = await pool.query(
			`SELECT
				 RANK() OVER (
					 ORDER BY COALESCE(SUM(a.nota_media), 0) DESC
				 ) AS colocacao,
				 p.id_projeto,
				 p.nome_projeto,
				 p.resumo,
				 p.estande,
				 COALESCE(SUM(a.nota_media), 0)::numeric(6,1) AS nota_media,
				 COUNT(a.id_avaliacao)::int AS total_avaliacoes
			 FROM projeto p
			 LEFT JOIN avaliacao a ON a.id_projeto = p.id_projeto
			 WHERE p.id_evento = $1
			 GROUP BY p.id_projeto
			 ORDER BY COALESCE(SUM(a.nota_media), 0) DESC, p.id_projeto`,
			[id_evento]
		);

		return res.status(200).json({
			evento: evento.rows[0],
			ranking: ranking.rows
		});
	} catch (error) {
		console.error("Erro ao gerar ranking:", error);
		return res.status(500).json({
			error: "Não foi possível gerar o ranking"
		});
	}
});

export default router;
