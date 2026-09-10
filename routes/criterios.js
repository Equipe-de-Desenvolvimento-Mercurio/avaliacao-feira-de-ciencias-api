import express from "express";

import pool from "../config/db.js"
import { validarToken } from "../services/security.js";

const router = express.Router();

router.get("/:id_usuario", validarToken, async (req, res) => {
    const id_usuario = req.params.id_usuario;

    if (String(req.usuario.id_usuario) !== String(id_usuario)) {
        return res.status(403).json({
            error: "Você só pode consultar seus próprios critérios"
        });
    }

    let usuario = await pool.query("SELECT * FROM usuario WHERE id_usuario = $1", [id_usuario]);
    if (usuario.rowCount == 0){
        return res.status(404).json({
            error: "Usuario não encontrado"
        });
    }

    let criterios = await pool.query("SELECT * FROM criterio_avaliativo WHERE tipo_avaliador = $1", [usuario.rows[0].tipo_avaliador]);

    if (criterios.rowCount == 0){
        return res.status(404).json({
            error: "Usuario Não encontrado"
        })
    }

    return res.json(criterios.rows);
});


export default router;