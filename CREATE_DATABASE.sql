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

CREATE TABLE criterio_avaliativo (
    id_criterio      BIGSERIAL PRIMARY KEY,
    tipo_avaliador   tipo_avaliador_enum NOT NULL,
    numero_criterio  SMALLINT NOT NULL CHECK (numero_criterio BETWEEN 1 AND 6), -- corresponde a nota1..nota6
    nome_criterio    VARCHAR(150) NOT NULL,
    descricao        TEXT,
    data_criacao     TIMESTAMP DEFAULT NOW(),
    UNIQUE (tipo_avaliador, numero_criterio)
);
INSERT INTO criterio_avaliativo
    (tipo_avaliador, numero_criterio, nome_criterio, descricao)
VALUES
    (
        'artistico',
        1,
        'Criatividade',
        'Avalie a capacidade do grupo de apresentar o projeto de forma original, criativa e atrativa. Considere a utilização de recursos visuais, elementos cenográficos, materiais e soluções que contribuam para tornar a apresentação diferenciada e interessante, sem comprometer a compreensão do conteúdo científico.'
    ),
    (
        'artistico',
        2,
        'Conhecimento (domínio da informação)',
        'Avalie se os integrantes demonstram domínio das informações apresentadas no projeto. Observe se conseguem explicar os conteúdos de forma clara, coerente e segura, utilizando linguagem adequada e demonstrando compreensão sobre o tema, em vez de apenas reproduzir informações memorizadas.'
    ),
    (
        'artistico',
        3,
        'Metodologia Científica',
        'Avalie a forma como o projeto apresenta e comunica sua metodologia científica. Observe se estão claros o problema ou pergunta de pesquisa, os objetivos, as hipóteses quando aplicáveis, os procedimentos realizados, a coleta de dados e as conclusões obtidas. Considere também se a apresentação visual facilita a compreensão dessas etapas.'
    ),
    (
        'artistico',
        4,
        'Conhecimento (aplicação prática e dados)',
        'Avalie a capacidade do grupo de relacionar o conhecimento científico apresentado com sua aplicação prática e com os dados obtidos durante o projeto. Observe se os resultados são apresentados de maneira compreensível e se os estudantes conseguem explicar a importância, as possíveis aplicações e as conclusões a partir das evidências coletadas.'
    ),
    (
        'artistico',
        5,
        'Higiene e Uniforme',
        'Avalie a organização, limpeza e apresentação visual dos integrantes e do espaço utilizado pelo grupo. Considere o uso adequado do uniforme ou vestimenta definida para a feira, a higiene pessoal, a conservação dos materiais e a manutenção de um ambiente limpo e organizado durante a apresentação.'
    ),
    (
        'artistico',
        6,
        'Organização do Grupo',
        'Avalie a organização dos integrantes durante a apresentação. Observe a divisão das funções, a participação equilibrada dos estudantes, a preparação dos materiais, a organização do espaço e a capacidade do grupo de conduzir a apresentação de forma coordenada, sem prejudicar a comunicação do projeto.'
    ),
    (
        'tecnico',
        1,
        'Criatividade',
        'Avalie a originalidade da proposta científica e das soluções desenvolvidas pelo grupo. Considere se o projeto apresenta uma abordagem diferenciada para o problema estudado, se utiliza recursos ou estratégias inovadoras e se demonstra iniciativa na elaboração e execução do trabalho.'
    ),
    (
        'tecnico',
        2,
        'Comunicação',
        'Avalie a capacidade dos integrantes de comunicar o projeto de forma clara, objetiva e organizada. Observe a clareza da explicação, o uso adequado da linguagem científica, a capacidade de responder às perguntas dos avaliadores e a interação dos estudantes com o público durante a apresentação.'
    ),
    (
        'tecnico',
        3,
        'Estética Visual',
        'Avalie a qualidade e a organização visual do espaço de apresentação e dos materiais utilizados. Considere a legibilidade de cartazes, painéis, gráficos, tabelas e demais recursos, bem como a harmonia visual, a organização das informações e a facilidade de compreensão do projeto por meio dos elementos apresentados.'
    ),
    (
        'tecnico',
        4,
        'Higiene e Uniforme',
        'Avalie a apresentação pessoal dos integrantes e as condições de higiene e segurança do espaço de exposição. Observe o uso adequado do uniforme ou vestimenta estabelecida, a limpeza dos materiais e do ambiente e, quando aplicável, os cuidados de higiene relacionados aos experimentos e demonstrações.'
    ),
    (
        'tecnico',
        5,
        'Organização do Grupo',
        'Avalie a organização e o planejamento do grupo durante a feira. Observe a divisão das responsabilidades, a participação dos integrantes, o domínio das etapas do projeto, a organização dos materiais e equipamentos e a capacidade de executar a apresentação de maneira coordenada e eficiente.'
    );
