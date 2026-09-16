const { pool } = require('../config/database');

// Model de horarios_acesso: regras de janela de horário
// permitida para um usuário (e, futuramente, também por
// dispositivo — ver nota no service de acesso).

async function listarTodos() {
  const [linhas] = await pool.query(
    `SELECT * FROM horarios_acesso ORDER BY id_horario`
  );
  return linhas;
}

async function buscarPorId(idHorario) {
  const [linhas] = await pool.query(
    `SELECT * FROM horarios_acesso WHERE id_horario = ?`,
    [idHorario]
  );
  return linhas[0] || null;
}

async function listarPorUsuario(idUsuario) {
  const [linhas] = await pool.query(
    `SELECT * FROM horarios_acesso WHERE id_usuario = ? ORDER BY dia_semana, hora_inicio`,
    [idUsuario]
  );
  return linhas;
}

async function criar(dados) {
  const { dia_semana, hora_inicio, hora_fim, id_usuario = null, id_dispositivo = null } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO horarios_acesso (dia_semana, hora_inicio, hora_fim, id_usuario, id_dispositivo)
     VALUES (?, ?, ?, ?, ?)`,
    [dia_semana, hora_inicio, hora_fim, id_usuario, id_dispositivo]
  );

  return buscarPorId(resultado.insertId);
}

async function remover(idHorario) {
  await pool.query(`DELETE FROM horarios_acesso WHERE id_horario = ?`, [idHorario]);
}

// Quantas regras de horário existem para este usuário, no total.
// Usado para saber se o usuário TEM alguma restrição configurada
// (se tiver 0, o acesso dele não é restrito por horário).
async function contarRegrasDoUsuario(idUsuario) {
  const [linhas] = await pool.query(
    `SELECT COUNT(*) AS total FROM horarios_acesso WHERE id_usuario = ?`,
    [idUsuario]
  );
  return linhas[0].total;
}

// Verifica se existe alguma regra do usuário que cubra o dia da
// semana e o horário atual informados.
async function existeRegraValidaAgora(idUsuario, diaSemana, horaAtual) {
  const [linhas] = await pool.query(
    `SELECT COUNT(*) AS total FROM horarios_acesso
     WHERE id_usuario = ? AND dia_semana = ? AND ? BETWEEN hora_inicio AND hora_fim`,
    [idUsuario, diaSemana, horaAtual]
  );
  return linhas[0].total > 0;
}

module.exports = {
  listarTodos,
  buscarPorId,
  listarPorUsuario,
  criar,
  remover,
  contarRegrasDoUsuario,
  existeRegraValidaAgora,
};
