const { pool } = require('../config/database');

// Model do log de acesso. É um log imutável (RN08): as funções
// aqui só permitem criar (registrar) e ler — nunca UPDATE ou DELETE.

async function listarTodos() {
  const [linhas] = await pool.query(
    `SELECT * FROM acesso ORDER BY data_hora DESC`
  );
  return linhas;
}

async function listarPaginado(pagina = 1, limite = 15, filtros = {}) {
  const offset = (pagina - 1) * limite;
  const condicoes = [];
  const parametros = [];

  if (filtros.idUsuario) {
    condicoes.push('id_usuario = ?');
    parametros.push(filtros.idUsuario);
  }
  if (filtros.idDispositivo) {
    condicoes.push('id_dispositivo = ?');
    parametros.push(filtros.idDispositivo);
  }
  if (filtros.status) {
    condicoes.push('status = ?');
    parametros.push(filtros.status);
  }
  if (filtros.dataInicio) {
    condicoes.push('data_hora >= ?');
    parametros.push(`${filtros.dataInicio} 00:00:00`);
  }
  if (filtros.dataFim) {
    condicoes.push('data_hora <= ?');
    parametros.push(`${filtros.dataFim} 23:59:59`);
  }

  const where = condicoes.length ? `WHERE ${condicoes.join(' AND ')}` : '';
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM acesso ${where}`,
    parametros
  );
  const [linhas] = await pool.query(
    `SELECT * FROM acesso ${where} ORDER BY data_hora DESC LIMIT ? OFFSET ?`,
    [...parametros, limite, offset]
  );
  return { dados: linhas, total };
}

async function buscarPorId(idAcesso) {
  const [linhas] = await pool.query(
    `SELECT * FROM acesso WHERE id_acesso = ?`,
    [idAcesso]
  );
  return linhas[0] || null;
}

// Busca o último registro de acesso de um usuário — usado para
// decidir automaticamente se a próxima passagem dele é uma
// entrada ou uma saída (alternando).
async function buscarUltimoPorUsuario(idUsuario) {
  const [linhas] = await pool.query(
    `SELECT * FROM acesso WHERE id_usuario = ? ORDER BY data_hora DESC LIMIT 1`,
    [idUsuario]
  );
  return linhas[0] || null;
}

async function registrar(dados) {
  const {
    tipo_movimento, status, motivo_negado = null,
    id_usuario = null, id_cartao = null, id_dispositivo,
  } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO acesso (tipo_movimento, status, motivo_negado, id_usuario, id_cartao, id_dispositivo)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [tipo_movimento, status, motivo_negado, id_usuario, id_cartao, id_dispositivo]
  );

  return buscarPorId(resultado.insertId);
}

module.exports = {
  listarTodos,
  listarPaginado,
  buscarPorId,
  buscarUltimoPorUsuario,
  registrar,
};
