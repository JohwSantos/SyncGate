const { pool } = require('../config/database');

// Model de cartões RFID. Assim como o model de usuários,
// ele só sabe ler e escrever na tabela `cartoes` — nenhuma
// regra de negócio aqui.

async function listarTodos() {
  const [linhas] = await pool.query(
    `SELECT * FROM cartoes ORDER BY id_cartao`
  );
  return linhas;
}

async function buscarPorId(idCartao) {
  const [linhas] = await pool.query(
    `SELECT * FROM cartoes WHERE id_cartao = ?`,
    [idCartao]
  );
  return linhas[0] || null;
}

// Usada mais pra frente, na etapa de validação de acesso: a
// partir do UID lido pelo dispositivo, descobrir qual cartão
// (e, por consequência, qual usuário) corresponde a ele.
async function buscarPorUid(uid) {
  const [linhas] = await pool.query(
    `SELECT * FROM cartoes WHERE uid = ?`,
    [uid]
  );
  return linhas[0] || null;
}

async function buscarPorUsuario(idUsuario) {
  const [linhas] = await pool.query(
    `SELECT * FROM cartoes WHERE id_usuario = ? ORDER BY id_cartao`,
    [idUsuario]
  );
  return linhas;
}

async function criar(dados) {
  const { uid, data_emissao = null, data_validade = null, id_usuario } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO cartoes (uid, data_emissao, data_validade, id_usuario)
     VALUES (?, ?, ?, ?)`,
    [uid, data_emissao, data_validade, id_usuario]
  );

  return buscarPorId(resultado.insertId);
}

// Ativa ou desativa um cartão sem apagar o registro — útil para
// quando um cartão é perdido, por exemplo: desativa o antigo e
// emite um novo, mantendo o histórico de acessos intacto.
async function definirAtivo(idCartao, ativo) {
  await pool.query(
    `UPDATE cartoes SET ativo = ? WHERE id_cartao = ?`,
    [ativo ? 1 : 0, idCartao]
  );
  return buscarPorId(idCartao);
}

async function remover(idCartao) {
  await pool.query(`DELETE FROM cartoes WHERE id_cartao = ?`, [idCartao]);
}

module.exports = {
  listarTodos,
  buscarPorId,
  buscarPorUid,
  buscarPorUsuario,
  criar,
  definirAtivo,
  remover,
};
