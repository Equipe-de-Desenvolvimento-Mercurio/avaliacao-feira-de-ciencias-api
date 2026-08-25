import argon2 from "argon2";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"

const SECRET = process.env.SECRET_JWT;

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
    let authHeader = req.headers.authorizathion;

    if (!authHeader){
        return res.status(401).json({
            error: 'Token Não Informado'
        })
    }

    const [_, token] = authHeader.split(" ");

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

}

async function criarHash(senha) {
    return await argon2.hash(senha, {
        type: argon2.argon2id
    });
}

async function compararSenha(hash, senha){
    return await argon2.verify(hash, senha)
}

export {criarHash, compararSenha, gerarTokenJwt}