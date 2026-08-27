import express from "express";
import pool from "../config/db.js";
import { criarHash, compararSenha, gerarTokenJwt } from "../services/security.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

const SECRET = process.env.SECRET_JWT;

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

  if (usuario.rowCount == 0) {
    return res.status(404).json({
      error: "Usuario ou senha não encontrados",
    });
  }

  usuario = usuario.rows[0];

  if (!(await compararSenha(usuario.senha_hash, senha))) {
    return res.status(404).json({
      error: "Usuario ou senha não encontrados",
    });
  }

  const token = gerarTokenJwt({
    id: usuario.id,
    email: usuario.email,
    tipo_avaliador: usuario.tipo_avaliador,
    tipo_usuario: usuario.tipo_usuario,
  });

  res.status(200).json({
    mensagem: "Login feito com Sucesso",
    data: {
      id: usuario.id_usuario,
      nome: usuario.nome_usuario,
      email: usuario.email,
      tipo_usuario: usuario.tipo_usuario,
    },
    token: token,
  });
});

router.post("/cadastrar", async (req, res) => {
  let { nome, email, senha, tipo_usuario, tipo_avaliador } = req.body;

  const TIPOS_USUARIOS = ["professor", "coordenador"];
  const TIPOS_AVALIADOR = ["tecnico", "artistico"];

  if (!nome || !email || !senha || !tipo_usuario || !tipo_avaliador) {
    return res.status(403).json({
      error: "Não foi possível cadastrar",
    });
  }

  let usuarioExiste = async (email) => {
    let usuarioEmail = await pool.query("SELECT 1 FROM usuario WHERE email = $1", [
      email,
    ]);
    return usuarioEmail.rowCount > 0;
  };
  if (await usuarioExiste(email)) {
    res.status(400).json({
      error: "Usuario já existe",
    });
  }
  if (
    !TIPOS_AVALIADOR.includes(tipo_avaliador) ||
    !TIPOS_USUARIOS.includes(tipo_usuario)
  ) {
    return res.status(400).json({
      error: "Informações invalidas",
    });
  }

  let hash = await criarHash(senha);

  await pool.query(
    "INSERT INTO usuario (nome_usuario, email, senha_hash, tipo_usuario, tipo_avaliador) VALUES ($1, $2, $3, $4, $5)",
    [nome, email, hash, tipo_usuario, tipo_avaliador]
  );

  return res.status(200).json({
    message: "Usuario Registrado com sucesso",
  });
});

router.get("/usuarios", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id_usuario, 
        nome_usuario, 
        email, 
        tipo_usuario::text,
        tipo_avaliador::text
      FROM usuario 
      ORDER BY id_usuario`
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Nenhum usuário encontrado",
      });
    }

    res.status(200).json({
      mensagem: "Usuários listados com sucesso",
      data: result.rows,
      total: result.rowCount
    });
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({
      error: "Erro interno ao listar usuários",
      detalhe: error.message,
    });
  }
});

router.get("/usuarios/professores", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id_usuario, 
        nome_usuario, 
        email, 
        tipo_usuario::text,
        tipo_avaliador::text
      FROM usuario 
      WHERE tipo_usuario::text = 'professor'
      ORDER BY nome_usuario`
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: "Nenhum professor encontrado",
      });
    }

    res.status(200).json({
      mensagem: `Encontrado(s) ${result.rowCount} professor(es)`,
      data: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("Erro ao buscar professores:", error);
    res.status(500).json({
      error: "Erro interno ao buscar professores",
      detalhe: error.message,
    });
  }
});

router.get("/usuario/id/:id", async (req, res) => {
  const { id } = req.params;

  console.log('🔍 Buscando por ID:', id);

  if (!id || isNaN(id)) {
    return res.status(400).json({
      error: "ID inválido. Deve ser um número.",
    });
  }

  try {
    const result = await pool.query(
      `SELECT 
        id_usuario, 
        nome_usuario, 
        email, 
        tipo_usuario::text,
        tipo_avaliador::text
      FROM usuario 
      WHERE id_usuario = $1`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: `Usuário com ID ${id} não encontrado`,
      });
    }

    res.status(200).json({
      mensagem: "Usuário encontrado com sucesso",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Erro ao buscar usuário por ID:", error);
    res.status(500).json({
      error: "Erro interno ao buscar usuário",
      detalhe: error.message,
    });
  }
});

router.get("/usuario/nome/:nome", async (req, res) => {
  const { nome } = req.params;

  console.log('🔍 Buscando por NOME:', nome);

  if (!nome || nome.trim() === "") {
    return res.status(400).json({
      error: "Nome é obrigatório para busca",
    });
  }

  try {
    const result = await pool.query(
      `SELECT 
        id_usuario, 
        nome_usuario, 
        email, 
        tipo_usuario::text,
        tipo_avaliador::text
      FROM usuario 
      WHERE nome_usuario ILIKE $1
      ORDER BY nome_usuario`,
      [`%${nome.trim()}%`]
    );

    console.log('📊 Encontrados:', result.rowCount);

    if (result.rowCount === 0) {
      return res.status(404).json({
        error: `Nenhum usuário encontrado com o nome "${nome}"`,
      });
    }

    res.status(200).json({
      mensagem: `Encontrado(s) ${result.rowCount} usuário(s) com o nome "${nome}"`,
      data: result.rows,
      total: result.rowCount,
    });
  } catch (error) {
    console.error("Erro ao buscar usuário por nome:", error);
    res.status(500).json({
      error: "Erro interno ao buscar usuário",
      detalhe: error.message,
    });
  }
});

export default router;