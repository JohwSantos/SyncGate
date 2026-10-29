const { pool } = require('../config/database');

// Service de relatórios de acesso — fornece dados agregados
// para o dashboard. Todas as queries usam GROUP BY no banco
// para evitar transferir milhares de linhas para o JS.

// Agrupa acessos por dia (últimos 30 dias por padrão).
// Retorna: [{ data, permitidos, negados, total }]
async function acessosPorDia(dias = 30) {
  const [linhas] = await pool.query(`
    SELECT
      DATE(data_hora) AS data,
      SUM(status = 'permitido') AS permitidos,
      SUM(status = 'negado')    AS negados,
      COUNT(*)                  AS total
    FROM acesso
    WHERE data_hora >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
    GROUP BY DATE(data_hora)
    ORDER BY data ASC
  `, [dias]);
  return linhas;
}

// Agrupa acessos por semana (segunda a domingo): a semana atual e
// as `semanas` anteriores, completas.
// Retorna: [{ inicio_semana, permitidos, negados, total }]
async function acessosPorSemana(semanas = 12) {
  const [linhas] = await pool.query(`
    SELECT
      DATE(DATE_SUB(data_hora, INTERVAL WEEKDAY(data_hora) DAY)) AS inicio_semana,
      SUM(status = 'permitido')  AS permitidos,
      SUM(status = 'negado')     AS negados,
      COUNT(*)                   AS total
    FROM acesso
    -- Começa numa segunda-feira, para a primeira semana vir completa.
    -- Agrupar só pela segunda-feira (e não por ano + número da semana)
    -- evita partir em duas a semana que atravessa a virada do ano.
    WHERE data_hora >= DATE_SUB(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL ? WEEK)
    GROUP BY inicio_semana
    ORDER BY inicio_semana ASC
  `, [semanas]);
  return linhas;
}

// Agrupa acessos por mês: o mês atual e os `meses` anteriores, completos.
// Retorna: [{ ano, mes, permitidos, negados, total }]
async function acessosPorMes(meses = 12) {
  const [linhas] = await pool.query(`
    SELECT
      YEAR(data_hora)            AS ano,
      MONTH(data_hora)           AS mes,
      SUM(status = 'permitido')  AS permitidos,
      SUM(status = 'negado')     AS negados,
      COUNT(*)                   AS total
    FROM acesso
    -- Começa no dia 1º, para o primeiro mês vir completo.
    WHERE data_hora >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL ? MONTH)
    GROUP BY ano, mes
    ORDER BY ano ASC, mes ASC
  `, [meses]);
  return linhas;
}

// Agrupa acessos por ano (todos os anos com registros).
// Retorna: [{ ano, permitidos, negados, total }]
async function acessosPorAno() {
  const [linhas] = await pool.query(`
    SELECT
      YEAR(data_hora)            AS ano,
      SUM(status = 'permitido')  AS permitidos,
      SUM(status = 'negado')     AS negados,
      COUNT(*)                   AS total
    FROM acesso
    GROUP BY ano
    ORDER BY ano ASC
  `);
  return linhas;
}

// Resumo rápido: totais gerais do banco e do dia atual.
// Usado nos cards de estatísticas do topo do dashboard.
async function resumoGeral() {
  const [[totais]] = await pool.query(`
    SELECT
      COUNT(*)                  AS total_acessos,
      SUM(status = 'permitido') AS total_permitidos,
      SUM(status = 'negado')    AS total_negados
    FROM acesso
  `);

  const [[hoje]] = await pool.query(`
    SELECT
      COUNT(*)                  AS total,
      SUM(status = 'permitido') AS permitidos,
      SUM(status = 'negado')    AS negados
    FROM acesso
    WHERE DATE(data_hora) = CURDATE()
  `);

  // Horário de pico de hoje (hora com mais acessos).
  const [picoHoje] = await pool.query(`
    SELECT
      HOUR(data_hora) AS hora,
      COUNT(*)        AS total
    FROM acesso
    WHERE DATE(data_hora) = CURDATE()
    GROUP BY hora
    ORDER BY total DESC
    LIMIT 1
  `);

  // Top 5 motivos de negação (útil para análise). O motivo de cartão
  // desconhecido traz o UID ("UID não cadastrado: A1B2C3D4"); aqui todos
  // contam juntos, senão cada cartão diferente vira uma linha.
  const [motivosNegacao] = await pool.query(`
    SELECT
      CASE WHEN motivo_negado LIKE 'UID não cadastrado%' THEN 'UID não cadastrado'
           ELSE motivo_negado END AS motivo,
      COUNT(*) AS total
    FROM acesso
    WHERE status = 'negado' AND motivo_negado IS NOT NULL
    GROUP BY 1
    ORDER BY total DESC
    LIMIT 5
  `);

  // Contagens dos cards do Dashboard (uma consulta só, com
  // subconsultas, para não fazer quatro idas ao banco).
  const [[contagens]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM usuarios)                                 AS total_usuarios,
      (SELECT COUNT(*) FROM cartoes WHERE ativo = 1)                  AS cartoes_ativos,
      (SELECT COUNT(*) FROM dispositivos WHERE status = 'online')     AS dispositivos_online,
      (SELECT COUNT(*) FROM solicitacao_acesso WHERE status = 'pendente') AS solicitacoes_pendentes
  `);

  return {
    // Campos usados pelos cards do Dashboard. Antes eles não eram
    // enviados, e o painel mostrava 0 em todos os cards.
    totalUsuarios: Number(contagens.total_usuarios) || 0,
    totalCartoesAtivos: Number(contagens.cartoes_ativos) || 0,
    dispositivosOnline: Number(contagens.dispositivos_online) || 0,
    solicitacoesPendentes: Number(contagens.solicitacoes_pendentes) || 0,
    acessosHoje: Number(hoje.total) || 0,
    permitidosHoje: Number(hoje.permitidos) || 0,
    negadosHoje: Number(hoje.negados) || 0,

    totais: {
      acessos: Number(totais.total_acessos) || 0,
      permitidos: Number(totais.total_permitidos) || 0,
      negados: Number(totais.total_negados) || 0,
    },
    hoje: {
      total: Number(hoje.total) || 0,
      permitidos: Number(hoje.permitidos) || 0,
      negados: Number(hoje.negados) || 0,
    },
    horarioPicoHoje: picoHoje[0] || null,
    topMotivosNegacao: motivosNegacao,
  };
}

// Distribuição de acessos por hora do dia (hoje).
// Retorna: [{ hora: 0-23, permitidos, negados, total }]
async function acessosPorHoraHoje() {
  const [linhas] = await pool.query(`
    SELECT
      HOUR(data_hora)           AS hora,
      SUM(status = 'permitido') AS permitidos,
      SUM(status = 'negado')    AS negados,
      COUNT(*)                  AS total
    FROM acesso
    WHERE DATE(data_hora) = CURDATE()
    GROUP BY hora
    ORDER BY hora ASC
  `);
  return linhas;
}


module.exports = {
  acessosPorDia,
  acessosPorSemana,
  acessosPorMes,
  acessosPorAno,
  resumoGeral,
  acessosPorHoraHoje,
};
