const solicitacaoService = require('../services/solicitacaoAcesso.service');

// Com ?pagina=N devolve uma página ({ dados, total, pagina,
// totalPaginas }); sem ela, a lista completa (como antes).
async function listar(req, res, next) {
  try {
    if (req.query.pagina) {
      const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
      const limite = Math.min(100, Math.max(1, parseInt(req.query.limite) || 10));
      const { dados, total } = await solicitacaoService.listarPaginado(pagina, limite);
      return res.json({ dados, total, pagina, totalPaginas: Math.ceil(total / limite) });
    }
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
