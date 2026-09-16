const horarioService = require('../services/horarioAcesso.service');

async function listar(req, res, next) {
  try {
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
