import argon2 from "argon2";
import jwt from "jsonwebtoken";
import "dotenv/config";

const SECRET = process.env.SECRET_JWT || process.env.SECRET;

if (!SECRET) {
    throw new Error("Defina SECRET_JWT ou SECRET no ambiente");
}

function gerarTokenJwt(payload){
    const token = jwt.sign(
    payload,
    SECRET,
    {
      expiresIn: "3h"
    }
  );

  return token;
}

function validarToken(req, res, next){
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")){
        return res.status(401).json({
            error: 'Token Não Informado'
        })
    }

    const [, token] = authHeader.split(" ");

    try {
        const payload = jwt.verify(token, SECRET)

        req.usuario = payload;

        next();
    } catch (error) {
        return res.status(401).json({
            error: "Token Invalido"
        })
    }


}
function validarRoles(...roles){
    return (req, res, next) => {
        if (!req.usuario || !roles.includes(req.usuario.tipo_usuario)) {
            return res.status(403).json({
                error: "Acesso negado"
            });
        }

        next();
    };
}

async function criarHash(senha) {
    return await argon2.hash(senha, {
        type: argon2.argon2id
    });
}

async function compararSenha(hash, senha){
    return await argon2.verify(hash, senha)
}

export {criarHash, compararSenha, gerarTokenJwt, validarToken, validarRoles}