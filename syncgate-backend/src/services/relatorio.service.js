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

// Agrupa acessos por semana (últimas 12 semanas).
// Retorna: [{ ano, semana, inicio_semana, permitidos, negados, total }]
async function acessosPorSemana(semanas = 12) {
  const [linhas] = await pool.query(`
    SELECT
      YEAR(data_hora)            AS ano,
      WEEK(data_hora, 1)         AS semana,
      DATE(DATE_SUB(data_hora, INTERVAL WEEKDAY(data_hora) DAY)) AS inicio_semana,
      SUM(status = 'permitido')  AS permitidos,
      SUM(status = 'negado')     AS negados,
      COUNT(*)                   AS total
    FROM acesso
    WHERE data_hora >= DATE_SUB(CURDATE(), INTERVAL ? WEEK)
    GROUP BY ano, semana, inicio_semana
    ORDER BY ano ASC, semana ASC
  `, [semanas]);
  return linhas;
}

// Agrupa acessos por mês (últimos 12 meses).
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
    WHERE data_hora >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
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

  // Top 5 motivos de negação (útil para análise).
  const [motivosNegacao] = await pool.query(`
    SELECT
      motivo_negado AS motivo,
      COUNT(*)      AS total
    FROM acesso
    WHERE status = 'negado' AND motivo_negado IS NOT NULL
    GROUP BY motivo_negado
    ORDER BY total DESC
    LIMIT 5
  `);

  return {
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
