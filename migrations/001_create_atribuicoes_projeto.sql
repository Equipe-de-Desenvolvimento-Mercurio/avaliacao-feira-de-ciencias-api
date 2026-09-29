CREATE TABLE IF NOT EXISTS atribuicao_projeto (
    id_atribuicao BIGSERIAL PRIMARY KEY,
    id_projeto BIGINT NOT NULL REFERENCES projeto(id_projeto) ON DELETE CASCADE,
    id_avaliador BIGINT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
    id_atribuido_por BIGINT NOT NULL REFERENCES usuario(id_usuario),
    data_criacao TIMESTAMP DEFAULT NOW(),
    UNIQUE (id_projeto, id_avaliador)
);

CREATE INDEX IF NOT EXISTS atribuicao_projeto_projeto_idx
    ON atribuicao_projeto (id_projeto);

CREATE INDEX IF NOT EXISTS atribuicao_projeto_avaliador_idx
    ON atribuicao_projeto (id_avaliador);