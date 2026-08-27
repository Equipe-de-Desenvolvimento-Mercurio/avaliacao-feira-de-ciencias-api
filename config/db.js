// config/db.js
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'postgres',
  password: '123456', // ← COLOQUE SUA SENHA
  port: 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000, // Timeout de conexão
});

// Evento para debug
pool.on('connect', () => {
  console.log('✅ Nova conexão estabelecida com o banco');
});

pool.on('error', (err) => {
  console.error('❌ Erro no pool de conexões:', err.message);
});

export default pool;