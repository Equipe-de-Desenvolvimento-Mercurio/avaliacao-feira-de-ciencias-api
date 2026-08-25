import argon2 from "argon2";

async function criarHash(senha) {
    return await argon2.hash(senha, {
        type: argon2.argon2id
    });
}

async function compararSenha(hash, senha){
    return await argon2.verify(hash, senha)
}

export {criarHash, compararSenha}