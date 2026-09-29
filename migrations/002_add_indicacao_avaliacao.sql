ALTER TABLE avaliacao
    ADD COLUMN IF NOT EXISTS indicacao VARCHAR(30);

ALTER TABLE avaliacao
    DROP CONSTRAINT IF EXISTS avaliacao_indicacao_check;

ALTER TABLE avaliacao
    ADD CONSTRAINT avaliacao_indicacao_check
    CHECK (indicacao IN ('jovem_cientista', 'inovacao', 'responsabilidade_social'));
