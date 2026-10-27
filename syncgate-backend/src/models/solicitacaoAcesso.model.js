const { pool } = require('../config/database');

async function listarTodos() {
  const [linhas] = await pool.query(
    `SELECT * FROM solicitacao_acesso ORDER BY data_solicitacao DESC`
  );
  return linhas;
}

// Versão paginada: devolve { dados, total }. Mais recentes primeiro;
// id_solicitacao desempata pedidos feitos no mesmo dia.
async function listarPaginado(pagina = 1, limite = 10) {
  const offset = (pagina - 1) * limite;
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM solicitacao_acesso`);
  const [linhas] = await pool.query(
    `SELECT * FROM solicitacao_acesso
      ORDER BY data_solicitacao DESC, id_solicitacao DESC
      LIMIT ? OFFSET ?`,
    [limite, offset]
  );
  return { dados: linhas, total };
}

async function buscarPorId(idSolicitacao) {
  const [linhas] = await pool.query(
    `SELECT * FROM solicitacao_acesso WHERE id_solicitacao = ?`,
    [idSolicitacao]
  );
  return linhas[0] || null;
}

async function criar(dados) {
  const {
    motivo_visita, destinatario = null, documento_visitante = null,
    id_usuario_solicitante,
  } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO solicitacao_acesso (motivo_visita, destinatario, documento_visitante, id_usuario_solicitante)
     VALUES (?, ?, ?, ?)`,
    [motivo_visita, destinatario, documento_visitante, id_usuario_solicitante]
  );

  return buscarPorId(resultado.insertId);
}

// Usada tanto para aprovar quanto para rejeitar — a diferença é
// só o valor de `status` que o service passa.
async function definirStatus(idSolicitacao, status) {
  await pool.query(
    `UPDATE solicitacao_acesso SET status = ?, data_aprovacao = CURDATE()
     WHERE id_solicitacao = ?`,
    [status, idSolicitacao]
  );
  return buscarPorId(idSolicitacao);
}

module.exports = {
  listarTodos,
  listarPaginado,
  buscarPorId,
  criar,
  definirStatus,
};
