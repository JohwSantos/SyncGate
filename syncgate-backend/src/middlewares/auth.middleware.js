const jwt = require('jsonwebtoken');
const env = require('../config/env');
const usuarioModel = require('../models/usuario.model');

// Confere o token e, em seguida, o usuário no banco. O token sozinho
// não basta: ele vale por horas, e nesse tempo o usuário pode ter sido
// bloqueado, excluído ou ter mudado de perfil. Por isso o perfil que
// vale é o do banco, não o que foi gravado no token no login.
// Também usado pelo WebSocket (socket.js).
async function usuarioDoToken(token) {
  const dados = jwt.verify(token, env.jwtSecret); // lança erro se inválido/expirado
  const usuario = await usuarioModel.buscarPorId(dados.id_usuario);
  if (!usuario || !usuario.status || !usuario.perfil) return null;
  return { id_usuario: usuario.id_usuario, login: usuario.login, tipo: usuario.tipo, perfil: usuario.perfil };
}

// Middleware que protege rotas: exige um token JWT válido no
// header "Authorization: Bearer <token>". Os dados do usuário logado
// ficam em req.usuarioLogado para quem precisar (ex.: saber quem fez uma ação).
async function verificarToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token não informado' });
  }

  let usuario;
  try {
    usuario = await usuarioDoToken(authHeader.split(' ')[1]);
  } catch (erro) {
    if (erro.name === 'JsonWebTokenError' || erro.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token inválido ou expirado' });
    }
    return next(erro); // falha do banco: erro 500, não "sessão expirada"
  }

  if (!usuario) {
    return res.status(401).json({ erro: 'Sessão encerrada: usuário bloqueado ou sem acesso ao painel' });
  }

  req.usuarioLogado = usuario;
  next();
}

module.exports = verificarToken;
module.exports.usuarioDoToken = usuarioDoToken;
