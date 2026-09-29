const { stringify } = require('csv-stringify/sync');
const { parse } = require('csv-parse/sync');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/database');
const usuarioModel = require('../models/usuario.model');
const cartaoModel = require('../models/cartao.model');
const dispositivoModel = require('../models/dispositivo.model');

// Função auxiliar para criar erros com status HTTP.
function erroComStatus(mensagem, status) {
  const erro = new Error(mensagem);
  erro.status = status;
  return erro;
}

// =====================================================================
// EXPORTAÇÃO — cada função devolve uma string CSV pronta para download
// =====================================================================

// Exporta usuários. Nunca inclui senha/hash (segurança).
async function exportarUsuarios() {
  const usuarios = await usuarioModel.listarTodos();

  return stringify(usuarios, {
    header: true,
    columns: [
      'id_usuario', 'nome', 'cpf', 'matricula', 'tipo',
      'email', 'telefone', 'curso', 'turma', 'cargo',
      'login', 'perfil', 'status', 'criado_em', 'atualizado_em',
    ],
  });
}

// Exporta cartões. Inclui o CPF do dono (em vez do id numérico)
// para que o CSV faça sentido sozinho, sem precisar cruzar tabelas.
async function exportarCartoes() {
  const [linhas] = await pool.query(`
    SELECT c.id_cartao, c.uid, c.ativo, c.data_emissao, c.data_validade,
           u.cpf AS cpf_usuario, u.nome AS nome_usuario
      FROM cartoes c
      JOIN usuarios u ON c.id_usuario = u.id_usuario
     ORDER BY c.id_cartao
  `);

  return stringify(linhas, {
    header: true,
    columns: [
      'id_cartao', 'uid', 'ativo', 'data_emissao', 'data_validade',
      'cpf_usuario', 'nome_usuario',
    ],
  });
}

// Exporta dispositivos.
async function exportarDispositivos() {
  const dispositivos = await dispositivoModel.listarTodos();

  return stringify(dispositivos, {
    header: true,
    columns: [
      'id_dispositivo', 'descricao', 'localizacao', 'ip_local',
      'status', 'ultima_comunicacao',
    ],
  });
}

// Exporta histórico de acessos (somente leitura — sem importação).
// Inclui nome do usuário e UID do cartão para legibilidade.
async function exportarHistorico() {
  const [linhas] = await pool.query(`
    SELECT a.id_acesso, a.data_hora, a.tipo_movimento, a.status,
           a.motivo_negado, a.id_usuario, u.nome AS nome_usuario,
           a.id_cartao, c.uid AS uid_cartao,
           a.id_dispositivo, d.descricao AS dispositivo
      FROM acesso a
      LEFT JOIN usuarios u ON a.id_usuario = u.id_usuario
      LEFT JOIN cartoes c ON a.id_cartao = c.id_cartao
      LEFT JOIN dispositivos d ON a.id_dispositivo = d.id_dispositivo
     ORDER BY a.data_hora DESC
  `);

  return stringify(linhas, {
    header: true,
    columns: [
      'id_acesso', 'data_hora', 'tipo_movimento', 'status',
      'motivo_negado', 'id_usuario', 'nome_usuario',
      'id_cartao', 'uid_cartao', 'id_dispositivo', 'dispositivo',
    ],
  });
}


// =====================================================================
// IMPORTAÇÃO — recebe o buffer do arquivo, parseia e insere no banco.
// Linhas com CPF/UID já existente são PULADAS (não dão erro).
// =====================================================================

// Importa usuários a partir de CSV.
// Campos obrigatórios no CSV: nome, cpf, tipo, login, senha.
// Linhas cujo CPF já existe no banco são puladas.
async function importarUsuarios(buffer) {
  const registros = parse(buffer, {
    columns: true,        // usa a primeira linha como cabeçalho
    skip_empty_lines: true,
    trim: true,
  });

  if (registros.length === 0) {
    throw erroComStatus('O arquivo CSV está vazio', 400);
  }

  const resultados = { inseridos: 0, pulados: 0, erros: [] };

  for (const [indice, reg] of registros.entries()) {
    const linha = indice + 2; // +2 porque linha 1 é cabeçalho

    // Validação dos campos obrigatórios
    if (!reg.nome || !reg.cpf || !reg.tipo || !reg.login || !reg.senha) {
      resultados.erros.push(`Linha ${linha}: campos obrigatórios faltando (nome, cpf, tipo, login, senha)`);
      continue;
    }

    // Verifica se o CPF já existe — se sim, pula
    const existente = await usuarioModel.buscarPorCpf(reg.cpf);
    if (existente) {
      resultados.pulados++;
      continue;
    }

    try {
      const senha_hash = await bcrypt.hash(reg.senha, 10);
      await usuarioModel.criar({
        nome: reg.nome,
        cpf: reg.cpf,
        matricula: reg.matricula || null,
        tipo: reg.tipo,
        email: reg.email || null,
        telefone: reg.telefone || null,
        curso: reg.curso || null,
        turma: reg.turma || null,
        cargo: reg.cargo || null,
        login: reg.login,
        senha_hash,
        perfil: reg.perfil || null,
      });
      resultados.inseridos++;
    } catch (erro) {
      resultados.erros.push(`Linha ${linha}: ${erro.message}`);
    }
  }

  return resultados;
}

// Importa cartões a partir de CSV.
// Referencia o usuário pelo CPF (não pelo id numérico).
// Campos obrigatórios: uid, cpf_usuario.
// Linhas cujo UID já existe no banco são puladas.
async function importarCartoes(buffer) {
  const registros = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (registros.length === 0) {
    throw erroComStatus('O arquivo CSV está vazio', 400);
  }

  const resultados = { inseridos: 0, pulados: 0, erros: [] };

  for (const [indice, reg] of registros.entries()) {
    const linha = indice + 2;

    if (!reg.uid || !reg.cpf_usuario) {
      resultados.erros.push(`Linha ${linha}: campos obrigatórios faltando (uid, cpf_usuario)`);
      continue;
    }

    // Verifica se o UID já existe — se sim, pula
    const existente = await cartaoModel.buscarPorUid(reg.uid);
    if (existente) {
      resultados.pulados++;
      continue;
    }

    // Busca o usuário pelo CPF
    const usuario = await usuarioModel.buscarPorCpf(reg.cpf_usuario);
    if (!usuario) {
      resultados.erros.push(`Linha ${linha}: usuário com CPF "${reg.cpf_usuario}" não encontrado`);
      continue;
    }

    try {
      await cartaoModel.criar({
        uid: reg.uid,
        data_emissao: reg.data_emissao || null,
        data_validade: reg.data_validade || null,
        id_usuario: usuario.id_usuario,
      });
      resultados.inseridos++;
    } catch (erro) {
      resultados.erros.push(`Linha ${linha}: ${erro.message}`);
    }
  }

  return resultados;
}

// Importa dispositivos a partir de CSV.
// Campo obrigatório: descricao.
// Pula linhas cuja descrição já exista (para evitar duplicação).
async function importarDispositivos(buffer) {
  const registros = parse(buffer, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (registros.length === 0) {
    throw erroComStatus('O arquivo CSV está vazio', 400);
  }

  const resultados = { inseridos: 0, pulados: 0, erros: [] };

  // Carrega todos os dispositivos atuais para checar duplicação
  const existentes = await dispositivoModel.listarTodos();
  const descricoesExistentes = new Set(
    existentes.map((d) => d.descricao.toLowerCase())
  );

  for (const [indice, reg] of registros.entries()) {
    const linha = indice + 2;

    if (!reg.descricao) {
      resultados.erros.push(`Linha ${linha}: campo obrigatório faltando (descricao)`);
      continue;
    }

    // Pula se a descrição já existe
    if (descricoesExistentes.has(reg.descricao.toLowerCase())) {
      resultados.pulados++;
      continue;
    }

    try {
      await dispositivoModel.criar({
        descricao: reg.descricao,
        localizacao: reg.localizacao || null,
        ip_local: reg.ip_local || null,
        status: reg.status || 'offline',
      });
      descricoesExistentes.add(reg.descricao.toLowerCase());
      resultados.inseridos++;
    } catch (erro) {
      resultados.erros.push(`Linha ${linha}: ${erro.message}`);
    }
  }

  return resultados;
}


module.exports = {
  exportarUsuarios,
  exportarCartoes,
  exportarDispositivos,
  exportarHistorico,
  importarUsuarios,
  importarCartoes,
  importarDispositivos,
};
