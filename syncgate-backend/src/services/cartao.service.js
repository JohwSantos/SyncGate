const cartaoModel = require('../models/cartao.model');
const usuarioModel = require('../models/usuario.model');

function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

async function listar() {
  return cartaoModel.listarTodos();
}

async function buscarPorId(id) {
  const cartao = await cartaoModel.buscarPorId(id);
  if (!cartao) {
    throw erroComStatus('Cartão não encontrado', 404);
  }
  return cartao;
}

async function listarPorUsuario(idUsuario) {
  // Confere se o usuário existe antes de listar os cartões dele —
  // isso evita devolver uma lista vazia "silenciosa" quando na
  // verdade o id do usuário nem existe.
  const usuario = await usuarioModel.buscarPorId(idUsuario);
  if (!usuario) {
    throw erroComStatus('Usuário não encontrado', 404);
  }
  return cartaoModel.buscarPorUsuario(idUsuario);
}

async function vincular(dados) {
  const { uid, id_usuario, data_emissao, data_validade } = dados;

  if (!uid || !id_usuario) {
    throw erroComStatus('Campos obrigatórios: uid, id_usuario', 400);
  }

  // RF08: só é possível vincular um cartão a um usuário que existe
  const usuario = await usuarioModel.buscarPorId(id_usuario);
  if (!usuario) {
    throw erroComStatus('Usuário não encontrado', 404);
  }

  // RN05: UID deve ser único no sistema. Verificamos aqui para
  // devolver uma mensagem clara (409), em vez de deixar o banco
  // rejeitar com um erro genérico de constraint.
  const existente = await cartaoModel.buscarPorUid(uid);
  if (existente) {
    throw erroComStatus('Já existe um cartão cadastrado com este UID', 409);
  }

  return cartaoModel.criar({ uid, id_usuario, data_emissao, data_validade });
}

async function definirAtivo(id, ativo) {
  await buscarPorId(id); // garante que existe (senão, 404)

  if (typeof ativo !== 'boolean') {
    throw erroComStatus('O campo "ativo" deve ser true ou false', 400);
  }

  return cartaoModel.definirAtivo(id, ativo);
}

// Excluir um cartão é sempre seguro: o histórico de acesso que usou
// esse cartão continua existindo (só fica sem a referência ao
// cartão específico) — por isso, diferente de usuário e
// dispositivo, aqui não esperamos erro de chave estrangeira.
async function remover(id) {
  await buscarPorId(id); // garante que existe (senão, 404)
  await cartaoModel.remover(id);
}

module.exports = {
  listar,
  buscarPorId,
  listarPorUsuario,
  vincular,
  definirAtivo,
  remover,
};
