const acessoService = require('../services/acesso.service');

// Esta é a rota que o ESP32 vai chamar de verdade em produção:
// ele lê o UID do cartão e envia pra cá, junto com o id do
// dispositivo que ele representa.
async function validar(req, res, next) {
  try {
    const resultado = await acessoService.validarAcesso(req.body);

    // Resposta MÍNIMA para o dispositivo: só o que ele precisa para
    // decidir (liberar ou não, e acender o LED certo). Antes também
    // devolvíamos o nome e o tipo da pessoa — qualquer um na rede que
    // testasse UIDs descobriria de quem é cada cartão. O painel
    // continua recebendo os detalhes completos pelo WebSocket.
    res.json({
      permitido: resultado.permitido,
      tipo_movimento: resultado.registro.tipo_movimento,
      motivo: resultado.permitido ? null : resultado.motivo,
    });
  } catch (erro) {
    next(erro);
  }
}

// POST /api/acesso/cartoes-autorizados  (ESP32 — modo offline)
async function cartoesAutorizados(req, res, next) {
  try {
    res.json(await acessoService.listarCartoesAutorizados(Number(req.body.id_dispositivo)));
  } catch (erro) {
    next(erro);
  }
}

// POST /api/acesso/offline  (ESP32 — envia a fila guardada sem internet)
async function offline(req, res, next) {
  try {
    res.json(await acessoService.registrarOffline(Number(req.body.id_dispositivo), req.body.registros));
  } catch (erro) {
    next(erro);
  }
}

async function listar(req, res, next) {
  try {
    if (req.query.pagina) {
      const pagina = Math.max(1, parseInt(req.query.pagina) || 1);
      const limite = Math.min(100, Math.max(1, parseInt(req.query.limite) || 15));
      const filtros = {
        idUsuario: req.query.idUsuario || null,
        idDispositivo: req.query.idDispositivo || null,
        status: ['permitido', 'negado'].includes(req.query.status) ? req.query.status : null,
        dataInicio: req.query.dataInicio || null,
        dataFim: req.query.dataFim || null,
      };
      const { dados, total } = await acessoService.listarPaginado(pagina, limite, filtros);
      return res.json({ dados, total, pagina, totalPaginas: Math.ceil(total / limite) });
    }
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
  cartoesAutorizados,
  offline,
  listar,
  buscarPorId,
};
