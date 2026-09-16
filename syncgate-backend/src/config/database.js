const mysql = require('mysql2/promise');
const env = require('./env');

// Um "pool" de conexões é mais eficiente do que abrir e fechar
// uma conexão nova a cada requisição: o pool mantém algumas conexões
// já abertas e as reutiliza. Isso será usado pelos models mais
// pra frente, quando criarmos as tabelas.
const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  waitForConnections: true,
  connectionLimit: 10,
});

// Função simples para testar se o banco está acessível.
// Vamos usar isso na rota /health.
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    return true;
  } catch (error) {
    return false;
  }
}

module.exports = { pool, testConnection };
