const acessoService = require('../services/acesso.service');

// Esta é a rota que o ESP32 vai chamar de verdade em produção:
// ele lê o UID do cartão e envia pra cá, junto com o id do
// dispositivo que ele representa.
async function validar(req, res, next) {
  try {
    const resultado = await acessoService.validarAcesso(req.body);
    res.json(resultado);
  } catch (erro) {
    next(erro);
  }
}

async function listar(req, res, next) {
  try {
    res.json(await acessoService.listar());
  } catch (erro) {
    next(erro);
  }
}

async function buscarPorId(req, res, next) {
  try {
    res.json(await acessoService.buscarPorId(req.params.id));
  } catch (erro) {
    next(erro);
  }
}

module.exports = {
  validar,
  listar,
  buscarPorId,
};
