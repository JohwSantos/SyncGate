const express = require('express');
const acessoController = require('../controllers/acesso.controller');
const verificarToken = require('../middlewares/auth.middleware');

const router = express.Router();

// POST /api/acesso/validar -> rota chamada pelo dispositivo (ESP32)
//                              a cada leitura de cartão (RF01-RF06).
//                              Fica PÚBLICA de propósito: quem chama
//                              aqui é hardware, não uma pessoa logada.
router.post('/validar', acessoController.validar);

// GET /api/acesso     -> histórico completo (RF10) — só para o painel,
// GET /api/acesso/:id -> por isso exige login.
router.get('/', verificarToken, acessoController.listar);
router.get('/:id', verificarToken, acessoController.buscarPorId);

module.exports = router;
