CREATE TYPE tipo_usuario_enum AS ENUM ('professor', 'coordenador');
CREATE TYPE tipo_avaliador_enum AS ENUM ('tecnico', 'artistico');
CREATE TYPE status_evento_enum AS ENUM ('planejado', 'em_andamento', 'encerrado');

CREATE TABLE usuario (
    id_usuario      BIGSERIAL PRIMARY KEY,
    nome_usuario    VARCHAR(150),
    email           VARCHAR(150),
    senha_hash      VARCHAR(255),
    tipo_usuario    tipo_usuario_enum,
    tipo_avaliador  tipo_avaliador_enum,  -- só para professor
    data_criacao    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE evento (
    id_evento       BIGSERIAL PRIMARY KEY,
    nome_evento     VARCHAR(150),
    data_evento     DATE,
    status          status_evento_enum
);

CREATE TABLE participacao_evento (
    id_participacao BIGSERIAL PRIMARY KEY,
    id_usuario      BIGINT REFERENCES usuario(id_usuario),
    id_evento       BIGINT REFERENCES evento(id_evento),
    data_vinculo    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projeto (
    id_projeto      BIGSERIAL PRIMARY KEY,
    id_evento       BIGINT REFERENCES evento(id_evento),
    nome_projeto    VARCHAR(200),
    resumo          TEXT,
    estande         VARCHAR(20),
    data_criacao    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE avaliacao (
    id_avaliacao    BIGSERIAL PRIMARY KEY,
    id_avaliador    BIGINT REFERENCES usuario(id_usuario),
    id_projeto      BIGINT REFERENCES projeto(id_projeto),
    nota1           NUMERIC(3,1),
    nota2           NUMERIC(3,1),
    nota3           NUMERIC(3,1),
    nota4           NUMERIC(3,1),
    nota5           NUMERIC(3,1),
    nota6           NUMERIC(3,1),
    nota_media      NUMERIC(3,1),
    comentario      TEXT,
    data_criacao    TIMESTAMP DEFAULT NOW()
);