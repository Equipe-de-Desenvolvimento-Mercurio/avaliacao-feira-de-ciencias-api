import express from "express";
import pool from "../config/db.js";
import { validarToken, validarRoles } from "../services/security.js";

const router = express.Router();

// {
//     "nome_categoria" : "Técnico em Química",
//     "descricao" : "Projetos do curso técnico em Química"
// }

router.post("/", validarToken, validarRoles("coordenador"), async (req, res) => {
    let { nome_categoria, descricao } = req.body;

    if (!nome_categoria){
        return res.status(400).json({
            error: "Informações invalidas"
        })
    }

    await pool.query("INSERT INTO categoria (nome_categoria, descricao) values ($1, $2)", [nome_categoria, descricao || null]);

    return res.status(200).json({
        message: "Categoria criada com sucesso!!"
    });
});

// Listar todas as categorias/áreas
router.get("/", async (req, res) => {
    let categorias = await pool.query("SELECT * FROM categoria ORDER BY nome_categoria");

    return res.status(200).json(categorias.rows);
});

// Pegar uma categoria pelo ID
router.get("/:id_categoria", async (req, res) => {
    let categoria = await pool.query("SELECT * FROM categoria WHERE id_categoria = $1", [req.params.id_categoria]);

    if (categoria.rowCount == 0){
        return res.status(404).json({
            error: "Categoria não encontrada"
        });
    }

    return res.status(200).json(categoria.rows[0]);
});

export default router;
