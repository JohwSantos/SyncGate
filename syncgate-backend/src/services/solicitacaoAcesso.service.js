const solicitacaoModel = require('../models/solicitacaoAcesso.model');
const usuarioModel = require('../models/usuario.model');
const websocket = require('../websocket/socket');

function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

async function listar() {
  return solicitacaoModel.listarTodos();
}

async function buscarPorId(id) {
  const solicitacao = await solicitacaoModel.buscarPorId(id);
  if (!solicitacao) {
    throw erroComStatus('Solicitação não encontrada', 404);
  }
  return solicitacao;
}

async function criar(dados) {
  const { motivo_visita, id_usuario_solicitante } = dados;

  if (!motivo_visita || !id_usuario_solicitante) {
    throw erroComStatus(
      'Campos obrigatórios: motivo_visita, id_usuario_solicitante',
      400
    );
  }

  const solicitante = await usuarioModel.buscarPorId(id_usuario_solicitante);
  if (!solicitante) {
    throw erroComStatus('Usuário solicitante não encontrado', 404);
  }

  const solicitacao = await solicitacaoModel.criar(dados);

  // Um gestor com o painel aberto precisa ver a solicitação
  // aparecer na hora, para poder aprovar/rejeitar rapidamente.
  websocket.emitir('solicitacao-atualizada', solicitacao);

  return solicitacao;
}

// Função interna compartilhada por aprovar() e rejeitar(): garante
// que só é possível decidir sobre uma solicitação que ainda está
// pendente — evita reprocessar uma decisão já tomada.
async function mudarStatus(id, novoStatus) {
  const solicitacao = await buscarPorId(id);

  if (solicitacao.status !== 'pendente') {
    const statusPorExtenso = solicitacao.status === 'aprovado' ? 'aprovada' : 'rejeitada';
    throw erroComStatus(
      `Esta solicitação já foi ${statusPorExtenso}, não pode ser alterada novamente`,
      409
    );
  }

  const atualizada = await solicitacaoModel.definirStatus(id, novoStatus);
  websocket.emitir('solicitacao-atualizada', atualizada);
  return atualizada;
}

async function aprovar(id) {
  return mudarStatus(id, 'aprovado');
}

async function rejeitar(id) {
  return mudarStatus(id, 'rejeitado');
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  aprovar,
  rejeitar,
};
