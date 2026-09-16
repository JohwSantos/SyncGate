const dispositivoModel = require('../models/dispositivo.model');
const websocket = require('../websocket/socket');

function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

const STATUS_VALIDOS = ['online', 'offline', 'manutencao'];

async function listar() {
  return dispositivoModel.listarTodos();
}

async function buscarPorId(id) {
  const dispositivo = await dispositivoModel.buscarPorId(id);
  if (!dispositivo) {
    throw erroComStatus('Dispositivo não encontrado', 404);
  }
  return dispositivo;
}

async function criar(dados) {
  const { descricao, status } = dados;

  if (!descricao) {
    throw erroComStatus('Campo obrigatório: descricao', 400);
  }

  if (status && !STATUS_VALIDOS.includes(status)) {
    throw erroComStatus(`status deve ser um de: ${STATUS_VALIDOS.join(', ')}`, 400);
  }

  return dispositivoModel.criar(dados);
}

async function atualizar(id, dados) {
  await buscarPorId(id); // garante que existe (senão, 404)

  if (!dados.descricao) {
    throw erroComStatus('Campo obrigatório: descricao', 400);
  }

  return dispositivoModel.atualizar(id, dados);
}

async function atualizarStatus(id, status) {
  await buscarPorId(id);

  if (!STATUS_VALIDOS.includes(status)) {
    throw erroComStatus(`status deve ser um de: ${STATUS_VALIDOS.join(', ')}`, 400);
  }

  const dispositivo = await dispositivoModel.atualizarStatus(id, status);

  // O painel precisa saber na hora se uma catraca ficou offline
  // ou entrou em manutenção — não faz sentido esperar um refresh
  // manual pra descobrir isso.
  websocket.emitir('dispositivo-atualizado', dispositivo);

  return dispositivo;
}

// Um dispositivo só pode ser excluído se nunca tiver aparecido em
// nenhum registro de acesso (a coluna acesso.id_dispositivo é
// obrigatória, então o banco recusa a exclusão nesse caso — é o
// que impede o histórico de acesso de ficar com uma referência
// quebrada para uma catraca que não existe mais).
async function remover(id) {
  await buscarPorId(id); // garante que existe (senão, 404)

  try {
    await dispositivoModel.remover(id);
  } catch (erro) {
    if (erro.errno === 1451 || erro.code === 'ER_ROW_IS_REFERENCED_2') {
      throw erroComStatus(
        'Não é possível excluir: este dispositivo já possui registros de acesso no histórico. ' +
          'Marque-o como "manutenção" ou "offline" em vez de excluir.',
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
  atualizarStatus,
  remover,
};
