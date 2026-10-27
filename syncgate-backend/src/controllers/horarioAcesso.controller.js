const horarioService = require('../services/horarioAcesso.service');

// Com ?pagina=N devolve uma página ({ dados, total, pagina,
// totalPaginas }); sem ela, a lista completa (como antes).
async function listar(req, res, next) {
  try {
    if (req.query.pagina) {
      const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
      const limite = Math.min(100, Math.max(1, parseInt(req.query.limite) || 10));
      const { dados, total } = await horarioService.listarPaginado(pagina, limite);
      return res.json({ dados, total, pagina, totalPaginas: Math.ceil(total / limite) });
    }
    res.json(await horarioService.listar());
  } catch (erro) {
    next(erro);
  }
}

async function listarPorUsuario(req, res, next) {
  try {
    res.json(await horarioService.listarPorUsuario(req.params.idUsuario));
  } catch (erro) {
    next(erro);
  }
}

async function criar(req, res, next) {
  try {
    const horario = await horarioService.criar(req.body);
    res.status(201).json(horario);
  } catch (erro) {
    next(erro);
  }
}

async function remover(req, res, next) {
  try {
    await horarioService.remover(req.params.id);
    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  listar,
  listarPorUsuario,
  criar,
  remover,
};
