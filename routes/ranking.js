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
					 PARTITION BY p.id_categoria
					 ORDER BY COALESCE(SUM(a.nota_media), 0) DESC
				 ) AS colocacao,
				 p.id_categoria,
				 c.nome_categoria,
				 p.id_projeto,
				 p.nome_projeto,
				 p.resumo,
				 p.estande,
				 COALESCE(SUM(a.nota_media), 0)::numeric(6,1) AS nota_media,
				 COUNT(a.id_avaliacao)::int AS total_avaliacoes
			 FROM projeto p
			 JOIN categoria c ON c.id_categoria = p.id_categoria
			 LEFT JOIN avaliacao a ON a.id_projeto = p.id_projeto
			 WHERE p.id_evento = $1
			 GROUP BY p.id_projeto, p.id_categoria, c.nome_categoria
			 ORDER BY c.nome_categoria, colocacao`,
			[id_evento]
		);

		// Agrupa o ranking em blocos por categoria/área
		const categorias = [];
		const indicePorCategoria = new Map();

		for (const linha of ranking.rows) {
			if (!indicePorCategoria.has(linha.id_categoria)) {
				indicePorCategoria.set(linha.id_categoria, categorias.length);
				categorias.push({
					id_categoria: linha.id_categoria,
					nome_categoria: linha.nome_categoria,
					ranking: []
				});
			}

			const { id_categoria: _idCat, nome_categoria: _nomeCat, ...dadosProjeto } = linha;
			categorias[indicePorCategoria.get(linha.id_categoria)].ranking.push(dadosProjeto);
		}

		return res.status(200).json({
			evento: evento.rows[0],
			categorias
		});
	} catch (error) {
		console.error("Erro ao gerar ranking:", error);
		return res.status(500).json({
			error: "Não foi possível gerar o ranking"
		});
	}
});

// Ranking dos projetos de uma categoria/área específica dentro de um evento
router.get("/:id_evento/:id_categoria", validarToken, async (req, res) => {
	const { id_evento, id_categoria } = req.params;

	if (!/^\d+$/.test(id_evento) || !/^\d+$/.test(id_categoria)) {
		return res.status(400).json({
			error: "ID do evento ou da categoria inválido"
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

		const categoria = await pool.query(
			"SELECT id_categoria, nome_categoria FROM categoria WHERE id_categoria = $1",
			[id_categoria]
		);

		if (categoria.rowCount === 0) {
			return res.status(404).json({
				error: "Categoria não encontrada"
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
			 WHERE p.id_evento = $1 AND p.id_categoria = $2
			 GROUP BY p.id_projeto
			 ORDER BY COALESCE(SUM(a.nota_media), 0) DESC, p.id_projeto`,
			[id_evento, id_categoria]
		);

		return res.status(200).json({
			evento: evento.rows[0],
			categoria: categoria.rows[0],
			ranking: ranking.rows
		});
	} catch (error) {
		console.error("Erro ao gerar ranking da categoria:", error);
		return res.status(500).json({
			error: "Não foi possível gerar o ranking"
		});
	}
});

export default router;