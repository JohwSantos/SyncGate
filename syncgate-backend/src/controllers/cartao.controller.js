const cartaoService = require('../services/cartao.service');

async function listar(req, res, next) {
  try {
    res.json(await cartaoService.listar());
  } catch (erro) {
    next(erro);
  }
}

async function buscarPorId(req, res, next) {
  try {
    res.json(await cartaoService.buscarPorId(req.params.id));
  } catch (erro) {
    next(erro);
  }
}

async function listarPorUsuario(req, res, next) {
  try {
    res.json(await cartaoService.listarPorUsuario(req.params.idUsuario));
  } catch (erro) {
    next(erro);
  }
}

async function vincular(req, res, next) {
  try {
    const cartao = await cartaoService.vincular(req.body);
    res.status(201).json(cartao);
  } catch (erro) {
    next(erro);
  }
}

async function definirAtivo(req, res, next) {
  try {
    const cartao = await cartaoService.definirAtivo(req.params.id, req.body.ativo);
    res.json(cartao);
  } catch (erro) {
    next(erro);
  }
}

async function remover(req, res, next) {
  try {
    await cartaoService.remover(req.params.id);
    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  listar,
  buscarPorId,
  listarPorUsuario,
  vincular,
  definirAtivo,
  remover,
};
