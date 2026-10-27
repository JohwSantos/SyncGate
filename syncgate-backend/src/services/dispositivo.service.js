const dispositivoModel = require('../models/dispositivo.model');
const websocket = require('../websocket/socket');
const chaveDispositivo = require('../utils/chaveDispositivo');

function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

const STATUS_VALIDOS = ['online', 'offline', 'manutencao'];

async function listar() {
  return dispositivoModel.listarTodos();
}

async function listarPaginado(pagina, limite) {
  return dispositivoModel.listarPaginado(pagina, limite);
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

  // A edição é parcial: a descrição só é obrigatória se for
  // enviada — nesse caso, não pode vir vazia.
  if (dados.descricao !== undefined && !String(dados.descricao).trim()) {
    throw erroComStatus('A descrição não pode ficar vazia', 400);
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

// Gera uma chave nova para o dispositivo e devolve a chave em texto
// — é a ÚNICA vez que ela aparece. No banco fica só o hash. Gerar
// de novo invalida a chave anterior (útil se ela vazar).
async function gerarChave(id) {
  await buscarPorId(id); // garante que existe (senão, 404)

  const chave = chaveDispositivo.gerarChave();
  const dispositivo = await dispositivoModel.definirHashDaChave(
    id,
    chaveDispositivo.calcularHash(chave)
  );

  websocket.emitir('dispositivo-atualizado', dispositivo);

  return { dispositivo, chave };
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
  listarPaginado,
  buscarPorId,
  criar,
  atualizar,
  atualizarStatus,
  gerarChave,
  remover,
};
