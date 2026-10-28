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
  // Sem valor padrão de propósito: um segredo "de exemplo" deixaria
  // qualquer um forjar tokens. Ver a checagem no fim deste arquivo.
  jwtSecret: process.env.JWT_SECRET,

  // Origens (endereços do painel) autorizadas a chamar a API pelo
  // navegador. Várias podem ser separadas por vírgula. O ESP32 não é
  // navegador e não é afetado por isso.
  corsOrigens: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean),

  // Fuso horário do sistema. Controle de acesso depende de "que
  // horas são agora" (regras de horário, relatórios de hoje), então
  // não podemos confiar no relógio do servidor: no Docker ele roda
  // em UTC, 3 horas à frente de Brasília.
  //
  // - timezone: nome do fuso (padrão IANA), usado pelo Node para
  //   calcular dia da semana e hora atual.
  // - dbTimezone: o mesmo fuso, escrito como deslocamento (-03:00),
  //   que é o formato que o MySQL/MariaDB aceita sem precisar de
  //   tabelas extras de fuso instaladas. O Brasil não tem mais
  //   horário de verão desde 2019, então -03:00 é fixo.
  timezone: process.env.APP_TIMEZONE || 'America/Sao_Paulo',
  dbTimezone: process.env.DB_TIMEZONE || '-03:00',

  // Quantos "proxies" existem entre a internet e a API.
  // Na Azure (App Service / Container Apps), toda requisição passa
  // por um balanceador antes de chegar no container — sem avisar o
  // Express, ele acharia que TODO MUNDO tem o IP do balanceador, e o
  // rate limit do login bloquearia todos juntos. Com TRUST_PROXY=1,
  // o Express usa o IP real do cliente (cabeçalho X-Forwarded-For).
  // Rodando direto no PC (sem proxy), deixe 0 — confiar num proxy
  // que não existe deixaria qualquer um "inventar" o próprio IP.
  trustProxy: Number(process.env.TRUST_PROXY) || 0,
};

// RNF03: a API não sobe sem um segredo JWT de verdade.
if (!module.exports.jwtSecret || module.exports.jwtSecret.length < 16) {
  throw new Error('JWT_SECRET não definido ou curto demais (mínimo 16 caracteres). Configure no .env ou no docker-compose.yml.');
}
