const express = require('express');
const acessoController = require('../controllers/acesso.controller');
const verificarToken = require('../middlewares/auth.middleware');
const autenticarDispositivo = require('../middlewares/autenticarDispositivo.middleware');
const { limitadorDispositivo } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// POST /api/acesso/validar -> rota chamada pelo dispositivo (ESP32)
//                              a cada leitura de cartão (RF01-RF06).
//                              Não usa login (verificarToken): quem chama
//                              é hardware. Em vez disso, o dispositivo
//                              se identifica com a sua chave secreta
//                              (autenticarDispositivo), e há um limite
//                              de leituras por minuto (limitadorDispositivo).
//
// A ORDEM importa: primeiro a chave, depois o limite. Se o limite
// viesse antes, alguém SEM chave poderia mandar dezenas de leituras
// falsas com o id da catraca e esgotar a cota dela — e a catraca de
// verdade passaria a ser bloqueada. Assim, só leituras autenticadas contam.
router.post('/validar', autenticarDispositivo, limitadorDispositivo, acessoController.validar);

// Modo offline (RNF08), também só para o dispositivo com a chave:
// POST /api/acesso/cartoes-autorizados -> lista que o leitor guarda
// POST /api/acesso/offline             -> acessos decididos sem internet
router.post('/cartoes-autorizados', autenticarDispositivo, limitadorDispositivo, acessoController.cartoesAutorizados);
router.post('/offline', autenticarDispositivo, limitadorDispositivo, acessoController.offline);

// GET /api/acesso     -> histórico completo (RF10) — só para o painel,
// GET /api/acesso/:id -> por isso exige login.
router.get('/', verificarToken, acessoController.listar);
router.get('/:id', verificarToken, acessoController.buscarPorId);

module.exports = router;
