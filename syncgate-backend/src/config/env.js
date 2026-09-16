// Carrega as variáveis do arquivo .env para dentro de process.env
require('dotenv').config();

// Centralizamos aqui a leitura das variáveis de ambiente.
// Assim, o resto do código nunca acessa `process.env` diretamente —
// ele importa este arquivo. Isso facilita saber, num lugar só,
// quais variáveis o projeto realmente usa.
module.exports = {
  port: process.env.PORT || 3000,

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'syncgate',
  },

  // Chave usada para assinar e verificar os tokens JWT.
  // Em produção, SEMPRE defina uma chave forte e secreta no .env —
  // o valor abaixo só existe para não quebrar o projeto em
  // ambiente de desenvolvimento se alguém esquecer de configurar.
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_troque_em_producao',
};
