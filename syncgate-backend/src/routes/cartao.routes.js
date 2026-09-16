const express = require('express');
const cartaoController = require('../controllers/cartao.controller');

const router = express.Router();

// GET   /api/cartoes                    -> lista todos
// GET   /api/cartoes/:id                -> busca um cartão
// GET   /api/cartoes/usuario/:idUsuario -> cartões de um usuário
// POST  /api/cartoes                    -> vincula um cartão a um usuário (RF08)
// PATCH /api/cartoes/:id/status          -> ativa/desativa um cartão

router.get('/', cartaoController.listar);
router.get('/usuario/:idUsuario', cartaoController.listarPorUsuario);
router.get('/:id', cartaoController.buscarPorId);
router.post('/', cartaoController.vincular);
router.patch('/:id/status', cartaoController.definirAtivo);
router.delete('/:id', cartaoController.remover);

module.exports = router;
