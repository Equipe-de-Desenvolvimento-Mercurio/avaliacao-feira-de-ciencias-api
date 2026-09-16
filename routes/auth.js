import express from "express";
import pool from "../config/db.js";
import { criarHash, compararSenha, gerarTokenJwt } from "../services/security.js";
import { validarToken, validarRoles } from "../services/security.js";

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

  if (!await compararSenha(usuario.senha_hash, senha)) {
    return res.status(404).json({
      error: "Usuario ou senha não encontrados",
    });
  }

  const token = gerarTokenJwt(
    {
      id_usuario: usuario.id_usuario,
      email: usuario.email,
      tipo_avaliador: usuario.tipo_avaliador,
      tipo_usuario: usuario.tipo_usuario
    }
  );

  res.status(200).json({
    mensagem: "Login feito com Sucesso",
    data: {
      id: usuario.id_usuario,
      nome: usuario.nome_usuario,
      email: usuario.email,
      tipo_usuario: usuario.tipo_usuario,
    },
    token: token
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
  let { nome, email, senha, tipo_usuario, tipo_avaliador, eventos } = req.body;

  const TIPOS_USUARIOS = ["professor", "coordenador"];
  const TIPOS_AVALIADOR = ["tecnico", "artistico", "convidado"];
  if (Array.isArray(eventos) && eventos.length > 0) {

    for (let i of eventos) {
      let evento = await pool.query("SELECT * FROM evento WHERE id_evento = $1", [i]);

      if (evento.rowCount == 0) {
        return res.status(404).json({
          error: "Evento não encontrado"
        });
      }
    }
  } 

  if (!nome || !email || !senha || !tipo_usuario || (tipo_usuario === "professor" && !tipo_avaliador)) {
    return res.status(403).json({
      error: "Não foi possível cadastrar"
    });
  }

  let usuarioExiste = async (email) => {
    let usuarioEmail = await pool.query("SELECT 1 FROM usuario WHERE email = $1", [email]);
    return usuarioEmail.rowCount > 0;
  }
  if (await usuarioExiste(email)) {
    return res.status(400).json({
      error: "Usuario já existe"
    })
  }
  if (!TIPOS_USUARIOS.includes(tipo_usuario) ||
      (tipo_avaliador && !TIPOS_AVALIADOR.includes(tipo_avaliador)) ||
      (tipo_usuario === "coordenador" && tipo_avaliador)) {
    return res.status(400).json({
      error: "Informações invalidas"
    });
  }

  let hash = await criarHash(senha);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const user = await client.query(
      "INSERT INTO usuario (nome_usuario, email, senha_hash, tipo_usuario, tipo_avaliador) VALUES ($1, $2, $3, $4, $5) RETURNING id_usuario",
      [nome, email, hash, tipo_usuario, tipo_avaliador || null]
    );

    const idUser = user.rows[0].id_usuario;

    if (Array.isArray(eventos) && eventos.length > 0) {
      for (const idEvento of [...new Set(eventos)]) {
        await client.query(
          "INSERT INTO participacao_evento (id_usuario, id_evento) VALUES ($1, $2)",
          [idUser, idEvento]
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({
      error: "Não foi possível concluir o cadastro"
    });
  } finally {
    client.release();
  }

  return res.status(200).json({
    message: "Usuario Registrado com sucesso"
  });
})


router.delete('/usuario/:id', validarToken, validarRoles("coordenador"), async (req, res) => {
  const { id } = req.params;

  const textoQuery = 'DELETE FROM usuario WHERE id_usuario = $1';

  const resultado = await pool.query(textoQuery, [id]);

  if (resultado.rowCount === 0) {
    return res.status(404).json({
      erro: "Usuário não encontrado."
    });
  }

  return res.status(200).json({
    mensagem: "Usuário deletado com sucesso!"
  });
});


export default router;