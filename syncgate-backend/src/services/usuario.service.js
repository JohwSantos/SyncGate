const bcrypt = require('bcryptjs');
const usuarioModel = require('../models/usuario.model');

// Aqui ficam as regras de negócio relacionadas a usuários.
// O controller nunca fala diretamente com o model — ele sempre
// passa por aqui, para garantir que essas regras sejam sempre
// aplicadas, não importa de onde a chamada venha.

// Função pequena para criar um erro já com o status HTTP certo.
// O errorHandler (middleware) lê err.status para decidir o
// código de resposta.
function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

const TIPOS_VALIDOS = ['aluno', 'professor', 'funcionario', 'admin'];
const PERFIS_VALIDOS = ['operador', 'gestor', 'master'];

async function listar() {
  return usuarioModel.listarTodos();
}

async function buscarPorId(id) {
  const usuario = await usuarioModel.buscarPorId(id);
  if (!usuario) {
    throw erroComStatus('Usuário não encontrado', 404);
  }
  return usuario;
}

async function criar(dados) {
  const { nome, cpf, tipo, login, senha, perfil } = dados;

  // Validação dos campos obrigatórios (RF07)
  if (!nome || !cpf || !tipo || !login || !senha) {
    throw erroComStatus(
      'Campos obrigatórios: nome, cpf, tipo, login, senha',
      400
    );
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    throw erroComStatus(`tipo deve ser um de: ${TIPOS_VALIDOS.join(', ')}`, 400);
  }

  if (perfil && !PERFIS_VALIDOS.includes(perfil)) {
    throw erroComStatus(`perfil deve ser um de: ${PERFIS_VALIDOS.join(', ')}`, 400);
  }

  // RN05 / regra de negócio: não permitir CPF duplicado.
  // Verificamos aqui, antes do INSERT, para devolver uma mensagem
  // clara (409 Conflict) em vez de um erro genérico de banco.
  const existente = await usuarioModel.buscarPorCpf(cpf);
  if (existente) {
    throw erroComStatus('Já existe um usuário cadastrado com este CPF', 409);
  }

  // Nunca guardamos a senha em texto puro — transformamos em hash.
  // O "10" é o custo do algoritmo bcrypt (quanto maior, mais lento
  // e mais seguro; 10 é um valor padrão razoável).
  const senha_hash = await bcrypt.hash(senha, 10);

  return usuarioModel.criar({ ...dados, senha_hash });
}

async function atualizar(id, dados) {
  // Garante que o usuário existe antes de tentar atualizar
  // (se não existir, buscarPorId já lança erro 404)
  await buscarPorId(id);

  if (dados.perfil && !PERFIS_VALIDOS.includes(dados.perfil)) {
    throw erroComStatus(`perfil deve ser um de: ${PERFIS_VALIDOS.join(', ')}`, 400);
  }

  return usuarioModel.atualizar(id, dados);
}

// RF09: bloquear ou desbloquear, sem apagar o cadastro
async function definirStatus(id, ativo) {
  await buscarPorId(id);

  if (typeof ativo !== 'boolean') {
    throw erroComStatus('O campo "ativo" deve ser true ou false', 400);
  }

  return usuarioModel.definirStatus(id, ativo);
}

// RN08/RF09: bloqueio é o caminho normal. Exclusão definitiva só é
// permitida quando o usuário não tem nada vinculado que dependa
// dele (cartões, solicitações) — o próprio banco garante isso via
// chave estrangeira; aqui só traduzimos o erro do banco em algo
// que faça sentido para quem está usando o painel.
async function remover(id) {
  await buscarPorId(id); // garante que existe (senão, 404)

  try {
    await usuarioModel.remover(id);
  } catch (erro) {
    if (erro.errno === 1451 || erro.code === 'ER_ROW_IS_REFERENCED_2') {
      throw erroComStatus(
        'Não é possível excluir: este usuário possui cartões ou solicitações vinculadas. ' +
          'Bloqueie o usuário em vez de excluir, ou remova os cartões vinculados primeiro.',
        409
      );
    }
    throw erro;
  }
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  definirStatus,
  remover,
};
