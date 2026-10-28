const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// "Rate limit" = limite de requisições por intervalo de tempo.
// Protege contra quem tenta milhares de vezes seguidas: adivinhar
// senhas (força bruta) ou inundar a API de leituras falsas.
// Quem passa do limite recebe 429 (Too Many Requests) até o tempo
// acabar. Os contadores ficam na memória do servidor.

// Mesma forma de resposta de erro do resto da API: { erro: "..." }
function responderLimite(mensagem) {
  return (req, res, next, opcoes) => {
    res.status(opcoes.statusCode).json({ erro: mensagem });
  };
}

// Login: 10 tentativas ERRADAS a cada 15 minutos, por IP + login.
// - skipSuccessfulRequests: logins certos não contam, então quem
//   digita a senha certa nunca é bloqueado por engano.
// - A chave junta IP e login: errar a senha do "admin" não bloqueia
//   outra pessoa que está entrando com outro login no mesmo Wi-Fi.
const limitadorLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => {
    const login = String((req.body && req.body.login) || '').toLowerCase();
    return `${ipKeyGenerator(req.ip)}|${login}`;
  },
  handler: responderLimite('Muitas tentativas de login. Aguarde 15 minutos e tente novamente.'),
});

// Validação de acesso (ESP32): 60 leituras por minuto por
// dispositivo — uma por segundo, bem acima do uso real de uma
// catraca, mas barra um equipamento com defeito. Roda DEPOIS do
// autenticarDispositivo (ver acesso.routes.js), então só conta
// leituras de quem apresentou a chave certa.
const limitadorDispositivo = rateLimit({
  windowMs: 60 * 1000,
  // Uma catraca real não passa de 1 leitura por segundo. O teste de
  // carga (scripts/medir-desempenho.js) sobe este valor via .env.
  limit: Number(process.env.LIMITE_LEITURAS_POR_MINUTO) || 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => `dispositivo-${Number(req.body && req.body.id_dispositivo) || ipKeyGenerator(req.ip)}`,
  handler: responderLimite('Muitas leituras em pouco tempo. Aguarde um minuto.'),
});

module.exports = { limitadorLogin, limitadorDispositivo };
