const mysql = require('mysql2/promise');
const env = require('./env');

// O fuso vai direto dentro de um comando SQL lá embaixo, então
// conferimos o formato (+HH:MM ou -HH:MM) antes — se alguém
// configurar um valor estranho no .env, a API nem sobe.
if (!/^[+-]\d{2}:\d{2}$/.test(env.dbTimezone)) {
  throw new Error(`DB_TIMEZONE inválido: "${env.dbTimezone}". Use o formato -03:00`);
}

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

  // Diz ao mysql2 em que fuso estão as datas gravadas no banco,
  // para ele converter corretamente DATETIME <-> Date do JavaScript.
  timezone: env.dbTimezone,
});

// Toda conexão nova do pool passa a "pensar" no horário de
// Brasília. Isso afeta tudo que o banco calcula sozinho:
// DEFAULT CURRENT_TIMESTAMP (data_hora dos acessos), NOW(),
// CURDATE() (relatórios de "hoje"), etc. Sem isso, num servidor
// em UTC um acesso às 20h seria gravado como 23h.
pool.pool.on('connection', (conexao) => {
  conexao.query(`SET time_zone = '${env.dbTimezone}'`);
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
