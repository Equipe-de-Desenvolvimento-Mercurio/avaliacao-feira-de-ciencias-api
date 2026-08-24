import express from "express";
import pool from "../config/db.js";
import {criarHash, compararSenha} from "../services/security.js";

const router = express.Router();

router.post("/login", async (req, res) => {
  let { email, senha } = req.body;
  if (!email || !senha) {
    return res.status(403).json({
      error: "Não é possivel fazer login",
    });
  }

  let usuario = await pool.query("SELECT * FROM usuario WHERE email = $1", [
    email,
  ]);

  // console.log(usuario.rows[0])
  if (usuario.rowCount == 0) {
    return res.status(404).json({
      error: "Usuario ou senha não encontrados",
    });
  }

  usuario = usuario.rows[0];

  if (compararSenha(usuario.senha_hash, senha)) {
    return res.status(404).json({
      error: "Usuario ou senha não encontrados",
    });
  }
  res.status(200).json({
    mensagem: "Login feito com Sucesso",
    data: {
      id: usuario.id_usuario,
      nome: usuario.nome_usuario,
      email: usuario.email,
      tipo_usuario: usuario.tipo_usuario,
    },
  });
});

// {
//     nome: "Ruy",
//     email: "ruy@gmail.com",
//     senha_hash: "biaanjos1234",
//     tipo_usuario: "avaliador",
//     tipo_avaliador: "tecnico"
// }
// Cadastrar Usuario
router.post("/cadastrar", async (req, res) => {
  let {nome, email, senha, tipo_usuario, tipo_avaliador} = req.body;

  const TIPOS_USUARIOS = ["professor", "coordenador"];
  const TIPOS_AVALIADOR = ["tecnico", "artistico"];

  if (!nome || !email || !senha || !tipo_usuario || !tipo_avaliador){
    return res.status(403).json({
      error: "Não foi possível cadastrar"
    });
  }

  if (!TIPOS_AVALIADOR.includes(tipo_avaliador) || !TIPOS_USUARIOS.includes(tipo_usuario)){
    return res.status(403).json({
      error: "Informações invalidas"
    });
  }

  let hash = await criarHash(senha);

    await pool.query("INSERT INTO usuario (nome_usuario, email, senha_hash, tipo_usuario, tipo_avaliador) VALUES ($1, $2, $3, $4, $5)", [nome, email, hash, tipo_usuario, tipo_avaliador]);

    return res.status(200).json({
      message: "Usuario Registrado com sucesso"
    });
})

export default router;
