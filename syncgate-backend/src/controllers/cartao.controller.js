const cartaoService = require('../services/cartao.service');

async function listar(req, res, next) {
  try {
    if (req.query.pagina) {
      const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
      const limite = Math.min(100, Math.max(1, parseInt(req.query.limite) || 10));
      const { dados, total } = await cartaoService.listarPaginado(pagina, limite);
      return res.json({ dados, total, pagina, totalPaginas: Math.ceil(total / limite) });
    }
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
