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

// Versão paginada: retorna { dados, total } para que o controller
// possa montar a resposta com metadados de paginação.
async function listarPaginado(pagina = 1, limite = 10, busca = '') {
  const offset = (pagina - 1) * limite;
  const termo = `%${busca.trim()}%`;
  const where = busca.trim()
    ? 'WHERE nome LIKE ? OR cpf LIKE ? OR login LIKE ? OR matricula LIKE ?'
    : '';
  const parametrosBusca = busca.trim() ? [termo, termo, termo, termo] : [];
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM usuarios ${where}`,
    parametrosBusca
  );
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} FROM usuarios ${where} ORDER BY nome LIMIT ? OFFSET ?`,
    [...parametrosBusca, limite, offset]
  );
  return { dados: linhas, total };
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

// Usada para conferir se um login já está em uso antes de
// cadastrar (o login é único — ver schema.sql).
async function buscarPorLogin(login) {
  const [linhas] = await pool.query(
    `SELECT ${COLUNAS} FROM usuarios WHERE login = ?`,
    [login]
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

// Campos que podem ser alterados pela edição. CPF, login, tipo,
// senha e status ficam de fora de propósito (status tem rota própria).
const CAMPOS_EDITAVEIS = [
  'nome', 'matricula', 'email', 'telefone', 'curso', 'turma', 'cargo', 'perfil',
];

// Atualização PARCIAL: só entram no UPDATE os campos que vieram
// em `dados`. Antes, um campo ausente virava `undefined`, que o
// mysql2 grava como NULL — ou seja, um PUT só com { nome } apagava
// email, telefone e até o perfil do usuário.
async function atualizar(idUsuario, dados) {
  const campos = CAMPOS_EDITAVEIS.filter((campo) => dados[campo] !== undefined);

  if (campos.length > 0) {
    // Os nomes das colunas vêm da lista fixa acima (nunca do
    // usuário), então montar o SET assim é seguro. Os VALORES
    // continuam indo como parâmetros (?), protegidos contra SQL Injection.
    const set = campos.map((campo) => `${campo} = ?`).join(', ');
    const valores = campos.map((campo) => dados[campo]);

    await pool.query(
      `UPDATE usuarios SET ${set} WHERE id_usuario = ?`,
      [...valores, idUsuario]
    );
  }

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
  listarPaginado,
  buscarPorId,
  buscarPorCpf,
  buscarPorLogin,
  buscarPorLoginComSenha,
  criar,
  atualizar,
  definirStatus,
  remover,
};
