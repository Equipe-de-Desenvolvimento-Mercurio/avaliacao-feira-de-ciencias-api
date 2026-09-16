import { Pool } from "pg";
import "dotenv/config"

const db = new Pool({
    connectionString: process.env.DATABASE_URL, // a URI que você pegou no painel
  ssl: { rejectUnauthorized: false } // o Supabase exige SSL
})

const prepararBanco = async () => {
    const constraints = await db.query(
        `SELECT conname
         FROM pg_constraint
         WHERE conrelid = 'avaliacao'::regclass
           AND pg_get_constraintdef(oid) ILIKE '%nota_media%'`
    );

    for (const { conname } of constraints.rows) {
        const nomeSeguro = conname.replaceAll('"', '""');
        await db.query(`ALTER TABLE avaliacao DROP CONSTRAINT IF EXISTS "${nomeSeguro}"`);
    }

    await db.query(
        "ALTER TABLE avaliacao ALTER COLUMN nota_media TYPE NUMERIC(5,1)"
    );
    await db.query(
        `ALTER TABLE avaliacao
         ADD CONSTRAINT avaliacao_nota_media_check
         CHECK (nota_media BETWEEN 0 AND 180)`
    );
};

export { prepararBanco };
export default db;