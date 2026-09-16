const solicitacaoService = require('../services/solicitacaoAcesso.service');

async function listar(req, res, next) {
  try {
    res.json(await solicitacaoService.listar());
  } catch (erro) {
    next(erro);
  }
}

async function buscarPorId(req, res, next) {
  try {
    res.json(await solicitacaoService.buscarPorId(req.params.id));
  } catch (erro) {
    next(erro);
  }
}

async function criar(req, res, next) {
  try {
    const solicitacao = await solicitacaoService.criar(req.body);
    res.status(201).json(solicitacao);
  } catch (erro) {
    next(erro);
  }
}

async function aprovar(req, res, next) {
  try {
    res.json(await solicitacaoService.aprovar(req.params.id));
  } catch (erro) {
    next(erro);
  }
}

async function rejeitar(req, res, next) {
  try {
    res.json(await solicitacaoService.rejeitar(req.params.id));
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  aprovar,
  rejeitar,
};
