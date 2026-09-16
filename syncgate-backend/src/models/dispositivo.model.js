const { pool } = require('../config/database');

// Model de dispositivos (catracas/leitores RFID).
// Só lê e escreve na tabela `dispositivos` — sem regras de negócio.

async function listarTodos() {
  const [linhas] = await pool.query(
    `SELECT * FROM dispositivos ORDER BY id_dispositivo`
  );
  return linhas;
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

async function atualizar(idDispositivo, dados) {
  const { descricao, localizacao, ip_local } = dados;

  await pool.query(
    `UPDATE dispositivos SET descricao = ?, localizacao = ?, ip_local = ?
     WHERE id_dispositivo = ?`,
    [descricao, localizacao, ip_local, idDispositivo]
  );

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
  buscarPorId,
  criar,
  atualizar,
  atualizarStatus,
  remover,
};
