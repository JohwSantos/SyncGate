const authService = require('../services/auth.service');

async function login(req, res, next) {
  try {
    const { login: loginUsuario, senha } = req.body;
    const resultado = await authService.login(loginUsuario, senha);
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
}

module.exports = { login };
