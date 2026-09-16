const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const usuarioModel = require('../models/usuario.model');
const env = require('../config/env');

function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

async function login(login, senha) {
  if (!login || !senha) {
    throw erroComStatus('Campos obrigatórios: login, senha', 400);
  }

  // buscarPorLoginComSenha é a única função do model que devolve
  // o senha_hash — todas as outras escondem esse campo de propósito.
  const usuario = await usuarioModel.buscarPorLoginComSenha(login);

  // Mensagem genérica de propósito: não revelamos se o problema foi
  // o login ou a senha, para não ajudar alguém tentando adivinhar
  // credenciais válidas.
  if (!usuario) {
    throw erroComStatus('Login ou senha inválidos', 401);
  }

  if (!usuario.status) {
    throw erroComStatus('Usuário bloqueado', 403);
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
  if (!senhaValida) {
    throw erroComStatus('Login ou senha inválidos', 401);
  }

  // O token carrega só o essencial para identificar quem está
  // logado e o que ele pode fazer — nunca a senha ou o hash dela.
  const token = jwt.sign(
    {
      id_usuario: usuario.id_usuario,
      login: usuario.login,
      tipo: usuario.tipo,
      perfil: usuario.perfil,
    },
    env.jwtSecret,
    { expiresIn: '8h' }
  );

  delete usuario.senha_hash;

  return { token, usuario };
}

module.exports = { login };
