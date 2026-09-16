const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Middleware que protege rotas: exige um token JWT válido no
// header "Authorization: Bearer <token>". Se o token for válido,
// os dados do usuário logado ficam disponíveis em req.usuarioLogado
// para quem precisar (ex.: saber quem fez uma ação).
function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não informado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    req.usuarioLogado = jwt.verify(token, env.jwtSecret);
    next();
  } catch (erro) {
    return res.status(401).json({ erro: 'Token inválido ou expirado' });
  }
}

module.exports = verificarToken;
