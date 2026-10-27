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

// Perfis "poderosos": só um master pode entregar esses perfis a
// alguém. Sem essa regra, um gestor conseguiria criar (ou se
// transformar em) um master — a chamada "escalada de privilégio".
const PERFIS_RESTRITOS = ['gestor', 'master'];

// ------------------------------------------------------------
// Regras de autorização (quem pode fazer o quê com quem)
// ------------------------------------------------------------
// `quemFaz` é o usuário logado (req.usuarioLogado, vindo do token).
// Quando ele é `null`, a chamada veio de dentro do próprio sistema
// (ex.: o script criarAdmin.js, rodado no terminal do servidor),
// e por isso não há restrição de perfil.

// Confere se `quemFaz` pode dar o perfil `perfil` a alguém.
function verificarPodeAtribuirPerfil(quemFaz, perfil) {
  if (!quemFaz) return;
  if (PERFIS_RESTRITOS.includes(perfil) && quemFaz.perfil !== 'master') {
    throw erroComStatus('Somente um master pode atribuir os perfis gestor ou master', 403);
  }
}

// Confere se `quemFaz` pode mexer no usuário `alvo` (editar,
// bloquear, excluir). Um gestor não pode mexer em um master.
function verificarPodeGerenciar(quemFaz, alvo) {
  if (!quemFaz) return;
  if (alvo.perfil === 'master' && quemFaz.perfil !== 'master') {
    throw erroComStatus('Somente um master pode alterar um usuário master', 403);
  }
}

// Ninguém pode bloquear, excluir ou trocar o próprio perfil:
// evita que alguém se tranque fora do sistema por engano.
function ehOProprio(quemFaz, idAlvo) {
  return !!quemFaz && Number(quemFaz.id_usuario) === Number(idAlvo);
}

// ------------------------------------------------------------
// Operações
// ------------------------------------------------------------

async function listar() {
  return usuarioModel.listarTodos();
}

async function listarPaginado(pagina, limite, busca) {
  return usuarioModel.listarPaginado(pagina, limite, busca);
}

async function buscarPorId(id) {
  const usuario = await usuarioModel.buscarPorId(id);
  if (!usuario) {
    throw erroComStatus('Usuário não encontrado', 404);
  }
  return usuario;
}

async function criar(dados, quemFaz = null) {
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

  verificarPodeAtribuirPerfil(quemFaz, perfil);

  // RN05 / regra de negócio: não permitir CPF duplicado.
  // Verificamos aqui, antes do INSERT, para devolver uma mensagem
  // clara (409 Conflict) em vez de um erro genérico de banco.
  const existente = await usuarioModel.buscarPorCpf(cpf);
  if (existente) {
    throw erroComStatus('Já existe um usuário cadastrado com este CPF', 409);
  }

  // Login também é único: com dois usuários de mesmo login, o
  // sistema não teria como saber qual deles está tentando entrar.
  const loginEmUso = await usuarioModel.buscarPorLogin(login);
  if (loginEmUso) {
    throw erroComStatus('Este login já está em uso por outro usuário', 409);
  }

  // Nunca guardamos a senha em texto puro — transformamos em hash.
  // O "10" é o custo do algoritmo bcrypt (quanto maior, mais lento
  // e mais seguro; 10 é um valor padrão razoável).
  const senha_hash = await bcrypt.hash(senha, 10);

  try {
    return await usuarioModel.criar({ ...dados, perfil: perfil || null, senha_hash });
  } catch (erro) {
    // Rede de segurança: se dois cadastros com o mesmo CPF/login
    // chegarem ao mesmo tempo, as checagens acima podem passar para
    // os dois — mas a restrição UNIQUE do banco barra o segundo.
    if (erro.code === 'ER_DUP_ENTRY') {
      throw erroComStatus('Já existe um usuário com este CPF ou login', 409);
    }
    throw erro;
  }
}

async function atualizar(id, dados, quemFaz = null) {
  // Garante que o usuário existe antes de tentar atualizar
  // (se não existir, buscarPorId já lança erro 404)
  const alvo = await buscarPorId(id);

  verificarPodeGerenciar(quemFaz, alvo);

  // Só tratamos o perfil se ele veio na requisição E mudou.
  // `perfil: null` (ou "") significa "remover o acesso ao painel".
  if (dados.perfil !== undefined) {
    const novoPerfil = dados.perfil || null;

    if (novoPerfil && !PERFIS_VALIDOS.includes(novoPerfil)) {
      throw erroComStatus(`perfil deve ser um de: ${PERFIS_VALIDOS.join(', ')}`, 400);
    }

    if (novoPerfil !== alvo.perfil) {
      if (ehOProprio(quemFaz, id)) {
        throw erroComStatus('Você não pode alterar o seu próprio perfil', 403);
      }
      verificarPodeAtribuirPerfil(quemFaz, novoPerfil);
    }

    dados = { ...dados, perfil: novoPerfil };
  }

  // Se o nome foi enviado, ele não pode ficar vazio.
  if (dados.nome !== undefined && !String(dados.nome).trim()) {
    throw erroComStatus('O nome não pode ficar vazio', 400);
  }

  return usuarioModel.atualizar(id, dados);
}

// RF09: bloquear ou desbloquear, sem apagar o cadastro
async function definirStatus(id, ativo, quemFaz = null) {
  const alvo = await buscarPorId(id);

  if (typeof ativo !== 'boolean') {
    throw erroComStatus('O campo "ativo" deve ser true ou false', 400);
  }

  verificarPodeGerenciar(quemFaz, alvo);

  if (!ativo && ehOProprio(quemFaz, id)) {
    throw erroComStatus('Você não pode bloquear a si mesmo', 403);
  }

  return usuarioModel.definirStatus(id, ativo);
}

// RN08/RF09: bloqueio é o caminho normal. Exclusão definitiva só é
// permitida quando o usuário não tem nada vinculado que dependa
// dele (cartões, solicitações) — o próprio banco garante isso via
// chave estrangeira; aqui só traduzimos o erro do banco em algo
// que faça sentido para quem está usando o painel.
async function remover(id, quemFaz = null) {
  const alvo = await buscarPorId(id); // garante que existe (senão, 404)

  verificarPodeGerenciar(quemFaz, alvo);

  if (ehOProprio(quemFaz, id)) {
    throw erroComStatus('Você não pode excluir a si mesmo', 403);
  }

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
  listarPaginado,
  buscarPorId,
  criar,
  atualizar,
  definirStatus,
  remover,
};
