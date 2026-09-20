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

  const professor = await pool.query(
    "SELECT id_usuario FROM usuario WHERE id_usuario = $1 AND tipo_usuario = 'professor'",
    [id]
  );

  if (professor.rowCount === 0) {
    return res.status(404).json({
      error: "Professor não encontrado"
    });
  }

  const avaliacoes = await pool.query(
    "SELECT 1 FROM avaliacao WHERE id_avaliador = $1 LIMIT 1",
    [id]
  );
  if (avaliacoes.rowCount > 0) {
    return res.status(409).json({
      error: "Não é possível excluir um professor que possui avaliações"
    });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM atribuicao_projeto WHERE id_avaliador = $1", [id]);
    await client.query("DELETE FROM participacao_evento WHERE id_usuario = $1", [id]);
    const resultado = await client.query(
      "DELETE FROM usuario WHERE id_usuario = $1",
      [id]
    );
    await client.query("COMMIT");

    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: "Professor não encontrado" });
    }
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao excluir professor:", error);
    return res.status(500).json({ error: "Não foi possível excluir o professor" });
  } finally {
    client.release();
  }

  return res.status(200).json({
    mensagem: "Usuário deletado com sucesso!"
  });
});

router.put('/usuario/:id', validarToken, validarRoles("coordenador"), async (req, res) => {
  const { id } = req.params;
  const { nome, email, senha, tipo_avaliador, eventos } = req.body;
  const tiposAvaliador = ["tecnico", "artistico", "convidado"];

  if (!nome || !email || !tipo_avaliador || !tiposAvaliador.includes(tipo_avaliador) || !Array.isArray(eventos)) {
    return res.status(400).json({
      error: "Informe nome, email, tipo de avaliador e a lista de eventos"
    });
  }

  const eventosUnicos = [...new Set(eventos)];
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const professor = await client.query(
      "SELECT id_usuario FROM usuario WHERE id_usuario = $1 AND tipo_usuario = 'professor' FOR UPDATE",
      [id]
    );
    if (professor.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Professor não encontrado" });
    }

    const eventosValidos = await client.query(
      "SELECT id_evento FROM evento WHERE id_evento = ANY($1::bigint[])",
      [eventosUnicos]
    );
    if (eventosValidos.rowCount !== eventosUnicos.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Um ou mais eventos não foram encontrados" });
    }

    const projetosForaDosEventos = await client.query(
      `SELECT 1
       FROM atribuicao_projeto ap
       JOIN projeto p ON p.id_projeto = ap.id_projeto
       WHERE ap.id_avaliador = $1
         AND NOT (p.id_evento = ANY($2::bigint[]))
       LIMIT 1`,
      [id, eventosUnicos]
    );
    if (projetosForaDosEventos.rowCount > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        error: "Remova as atribuições de projetos dos eventos que serão desvinculados antes de editar o professor"
      });
    }

    const campos = [nome, email, tipo_avaliador, id];
    let consultaUsuario =
      "UPDATE usuario SET nome_usuario = $1, email = $2, tipo_avaliador = $3";
    if (senha) {
      const hash = await criarHash(senha);
      campos.splice(3, 0, hash);
      consultaUsuario += ", senha_hash = $4 WHERE id_usuario = $5";
    } else {
      consultaUsuario += " WHERE id_usuario = $4";
    }

    const usuarioAtualizado = await client.query(
      `${consultaUsuario} RETURNING id_usuario, nome_usuario, email, tipo_usuario, tipo_avaliador`,
      campos
    );

    await client.query("DELETE FROM participacao_evento WHERE id_usuario = $1", [id]);
    for (const idEvento of eventosUnicos) {
      await client.query(
        "INSERT INTO participacao_evento (id_usuario, id_evento) VALUES ($1, $2)",
        [id, idEvento]
      );
    }

    await client.query("COMMIT");
    return res.status(200).json(usuarioAtualizado.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") {
      return res.status(409).json({ error: "Este email já está cadastrado" });
    }
    console.error("Erro ao editar professor:", error);
    return res.status(500).json({ error: "Não foi possível editar o professor" });
  } finally {
    client.release();
  }
});


export default router;