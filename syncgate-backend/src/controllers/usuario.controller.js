const usuarioService = require('../services/usuario.service');

// O controller só faz três coisas: pega dados da requisição,
// chama o service, e devolve a resposta. Nenhuma regra de
// negócio deve aparecer aqui — isso já fica no service.
//
// Todo erro é repassado para o next(erro), que cai no
// errorHandler (middleware central de erros).

async function listar(req, res, next) {
  try {
    // Se ?pagina= for informado, devolve com metadados de paginação.
    // Caso contrário, devolve o array plano (retrocompatível).
    if (req.query.pagina) {
      const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
      const limite = Math.min(100, Math.max(1, parseInt(req.query.limite) || 10));
      const { dados, total } = await usuarioService.listarPaginado(pagina, limite);
      return res.json({
        dados,
        total,
        pagina,
        totalPaginas: Math.ceil(total / limite),
      });
    }
    const usuarios = await usuarioService.listar();
    res.json(usuarios);
  } catch (erro) {
    next(erro);
  }
}

async function buscarPorId(req, res, next) {
  try {
    const usuario = await usuarioService.buscarPorId(req.params.id);
    res.json(usuario);
  } catch (erro) {
    next(erro);
  }
}

async function criar(req, res, next) {
  try {
    const novoUsuario = await usuarioService.criar(req.body);
    res.status(201).json(novoUsuario);
  } catch (erro) {
    next(erro);
  }
}

async function atualizar(req, res, next) {
  try {
    const usuarioAtualizado = await usuarioService.atualizar(req.params.id, req.body);
    res.json(usuarioAtualizado);
  } catch (erro) {
    next(erro);
  }
}

async function definirStatus(req, res, next) {
  try {
    const usuarioAtualizado = await usuarioService.definirStatus(req.params.id, req.body.ativo);
    res.json(usuarioAtualizado);
  } catch (erro) {
    next(erro);
  }
}

async function remover(req, res, next) {
  try {
    await usuarioService.remover(req.params.id);
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
  definirStatus,
  remover,
};
