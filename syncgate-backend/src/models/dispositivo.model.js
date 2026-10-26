const { pool } = require('../config/database');

// Model de dispositivos (catracas/leitores RFID).
// Só lê e escreve na tabela `dispositivos` — sem regras de negócio.

async function listarTodos() {
  const [linhas] = await pool.query(
    `SELECT * FROM dispositivos ORDER BY id_dispositivo`
  );
  return linhas;
}

async function listarPaginado(pagina = 1, limite = 10) {
  const offset = (pagina - 1) * limite;
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM dispositivos`
  );
  const [linhas] = await pool.query(
    `SELECT * FROM dispositivos ORDER BY id_dispositivo LIMIT ? OFFSET ?`,
    [limite, offset]
  );
  return { dados: linhas, total };
}

async function buscarPorId(idDispositivo) {
  const [linhas] = await pool.query(
    `SELECT * FROM dispositivos WHERE id_dispositivo = ?`,
    [idDispositivo]
  );
  return linhas[0] || null;
}

async function criar(dados) {
  const { descricao, localizacao = null, ip_local = null, status = 'offline' } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO dispositivos (descricao, localizacao, ip_local, status)
     VALUES (?, ?, ?, ?)`,
    [descricao, localizacao, ip_local, status]
  );

  return buscarPorId(resultado.insertId);
}

// Campos que podem ser alterados pela edição (status tem rota própria).
const CAMPOS_EDITAVEIS = ['descricao', 'localizacao', 'ip_local'];

// Atualização PARCIAL: só os campos enviados entram no UPDATE,
// para que um campo ausente não seja apagado (gravado como NULL).
async function atualizar(idDispositivo, dados) {
  const campos = CAMPOS_EDITAVEIS.filter((campo) => dados[campo] !== undefined);

  if (campos.length > 0) {
    // Nomes de coluna vêm da lista fixa acima; valores vão como parâmetros (?).
    const set = campos.map((campo) => `${campo} = ?`).join(', ');
    const valores = campos.map((campo) => dados[campo]);

    await pool.query(
      `UPDATE dispositivos SET ${set} WHERE id_dispositivo = ?`,
      [...valores, idDispositivo]
    );
  }

  return buscarPorId(idDispositivo);
}

// Atualiza o status e marca o momento da última comunicação.
// Esta é a função que, mais pra frente, o próprio ESP32 vai
// acionar periodicamente (um "sinal de vida"), para o painel
// saber se o dispositivo está online.
async function atualizarStatus(idDispositivo, status) {
  await pool.query(
    `UPDATE dispositivos SET status = ?, ultima_comunicacao = NOW()
     WHERE id_dispositivo = ?`,
    [status, idDispositivo]
  );
  return buscarPorId(idDispositivo);
}

async function remover(idDispositivo) {
  await pool.query(`DELETE FROM dispositivos WHERE id_dispositivo = ?`, [idDispositivo]);
}

module.exports = {
  listarTodos,
  listarPaginado,
  buscarPorId,
  criar,
  atualizar,
  atualizarStatus,
  remover,
};
