-- Execute uma vez no banco já existente.
-- A pontuacao tecnica pode chegar a 180 (6 notas x 10 x peso 3).
ALTER TABLE avaliacao
    ALTER COLUMN nota_media TYPE NUMERIC(5,1);

ALTER TABLE avaliacao
    DROP CONSTRAINT IF EXISTS avaliacao_nota_media_check;

ALTER TABLE avaliacao
    ADD CONSTRAINT avaliacao_nota_media_check
    CHECK (nota_media BETWEEN 0 AND 180);
