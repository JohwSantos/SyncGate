const dispositivoService = require('../services/dispositivo.service');

async function listar(req, res, next) {
  try {
    res.json(await dispositivoService.listar());
  } catch (erro) {
    next(erro);
  }
}

async function buscarPorId(req, res, next) {
  try {
    res.json(await dispositivoService.buscarPorId(req.params.id));
  } catch (erro) {
    next(erro);
  }
}

async function criar(req, res, next) {
  try {
    const dispositivo = await dispositivoService.criar(req.body);
    res.status(201).json(dispositivo);
  } catch (erro) {
    next(erro);
  }
}

async function atualizar(req, res, next) {
  try {
    const dispositivo = await dispositivoService.atualizar(req.params.id, req.body);
    res.json(dispositivo);
  } catch (erro) {
    next(erro);
  }
}

async function atualizarStatus(req, res, next) {
  try {
    const dispositivo = await dispositivoService.atualizarStatus(req.params.id, req.body.status);
    res.json(dispositivo);
  } catch (erro) {
    next(erro);
  }
}

async function remover(req, res, next) {
  try {
    await dispositivoService.remover(req.params.id);
    res.status(204).send();
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  listar,
  buscarPorId,
  criar,
  atualizar,
  atualizarStatus,
  remover,
};
