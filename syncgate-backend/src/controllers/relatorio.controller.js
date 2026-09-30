const relatorioService = require('../services/relatorio.service');

async function resumoGeral(req, res, next) {
  try {
    const resumo = await relatorioService.resumoGeral();
    res.json(resumo);
  } catch (erro) {
    next(erro);
  }
}

async function acessosPorDia(req, res, next) {
  try {
    const dias = parseInt(req.query.dias) || 30;
    const dados = await relatorioService.acessosPorDia(dias);
    res.json(dados);
  } catch (erro) {
    next(erro);
  }
}

async function acessosPorSemana(req, res, next) {
  try {
    const semanas = parseInt(req.query.semanas) || 12;
    const dados = await relatorioService.acessosPorSemana(semanas);
    res.json(dados);
  } catch (erro) {
    next(erro);
  }
}

async function acessosPorMes(req, res, next) {
  try {
    const meses = parseInt(req.query.meses) || 12;
    const dados = await relatorioService.acessosPorMes(meses);
    res.json(dados);
  } catch (erro) {
    next(erro);
  }
}

async function acessosPorAno(req, res, next) {
  try {
    const dados = await relatorioService.acessosPorAno();
    res.json(dados);
  } catch (erro) {
    next(erro);
  }
}

async function acessosPorHoraHoje(req, res, next) {
  try {
    const dados = await relatorioService.acessosPorHoraHoje();
    res.json(dados);
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  resumoGeral,
  acessosPorDia,
  acessosPorSemana,
  acessosPorMes,
  acessosPorAno,
  acessosPorHoraHoje,
};
