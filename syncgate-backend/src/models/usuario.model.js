const { pool } = require('../config/database');

// Este model só sabe conversar com a tabela `usuarios`.
// Ele não decide SE um usuário pode ser criado, se a senha é
// válida, etc — isso é responsabilidade da camada de service,
// que vamos criar na próxima etapa. Aqui é só "ler e escrever".

// Lista de colunas que o model expõe. Centralizar isso evita
// repetir a mesma lista de campos em cada SELECT.
const COLUNAS = `
  id_usuario, nome, cpf, matricula, tipo, email, telefone,
  curso, turma, cargo, login, perfil, status, criado_em, atualizado_em
`;
// Propositalmente NÃO incluímos senha_hash na lista acima:
// assim, nenhuma consulta de listagem/busca devolve o hash da
// senha por acidente. Quem precisar dele (login) usa uma função
// específica: buscarPorLoginComSenha().

async function listarTodos() {
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} FROM usuarios ORDER BY nome`
  );
  return linhas;
}

async function buscarPorId(idUsuario) {
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} FROM usuarios WHERE id_usuario = ?`,
    [idUsuario]
  );
  return linhas[0] || null;
}

async function buscarPorCpf(cpf) {
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} FROM usuarios WHERE cpf = ?`,
    [cpf]
  );
  return linhas[0] || null;
}

// Usada só pela futura etapa de autenticação — é a única função
// que devolve o senha_hash.
async function buscarPorLoginComSenha(login) {
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS}, senha_hash FROM usuarios WHERE login = ?`,
    [login]
  );
  return linhas[0] || null;
}

async function criar(dados) {
  const {
    nome, cpf, matricula = null, tipo, email = null, telefone = null,
    curso = null, turma = null, cargo = null, login, senha_hash,
    perfil = null,
  } = dados;

  const [resultado] = await pool.query(
    `INSERT INTO usuarios
      (nome, cpf, matricula, tipo, email, telefone, curso, turma, cargo, login, senha_hash, perfil)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [nome, cpf, matricula, tipo, email, telefone, curso, turma, cargo, login, senha_hash, perfil]
  );

  return buscarPorId(resultado.insertId);
}

async function atualizar(idUsuario, dados) {
  const {
    nome, matricula, email, telefone, curso, turma, cargo, perfil,
  } = dados;

  await pool.query(
    `UPDATE usuarios SET
      nome = ?, matricula = ?, email = ?, telefone = ?,
      curso = ?, turma = ?, cargo = ?, perfil = ?
     WHERE id_usuario = ?`,
    [nome, matricula, email, telefone, curso, turma, cargo, perfil, idUsuario]
  );

  return buscarPorId(idUsuario);
}

// RF09: bloqueia ou desbloqueia um usuário, sem apagar o cadastro.
async function definirStatus(idUsuario, ativo) {
  await pool.query(
    `UPDATE usuarios SET status = ? WHERE id_usuario = ?`,
    [ativo ? 1 : 0, idUsuario]
  );
  return buscarPorId(idUsuario);
}

// RF09 já cobre bloquear/desbloquear sem apagar. Esta função é
// para exclusão DEFINITIVA — só deve ser chamada quando o service
// já confirmou que não há dependências que impeçam isso.
async function remover(idUsuario) {
  await pool.query(`DELETE FROM usuarios WHERE id_usuario = ?`, [idUsuario]);
}

module.exports = {
  listarTodos,
  buscarPorId,
  buscarPorCpf,
  buscarPorLoginComSenha,
  criar,
  atualizar,
  definirStatus,
  remover,
};
