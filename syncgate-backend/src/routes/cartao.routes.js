const express = require('express');
const cartaoController = require('../controllers/cartao.controller');
const permitirPerfil = require('../middlewares/permissao.middleware');

const router = express.Router();

// GET   /api/cartoes                    -> lista todos (qualquer perfil autenticado)
// GET   /api/cartoes/:id                -> busca um cartão (qualquer perfil autenticado)
// GET   /api/cartoes/usuario/:idUsuario -> cartões de um usuário (qualquer perfil autenticado)
// POST  /api/cartoes                    -> vincula um cartão (master)
// PATCH /api/cartoes/:id/status          -> ativa/desativa (master)
// DELETE /api/cartoes/:id                -> exclui (master)

router.get('/', cartaoController.listar);
router.get('/usuario/:idUsuario', cartaoController.listarPorUsuario);
router.get('/:id', cartaoController.buscarPorId);
router.post('/', permitirPerfil('master'), cartaoController.vincular);
router.patch('/:id/status', permitirPerfil('master'), cartaoController.definirAtivo);
router.delete('/:id', permitirPerfil('master'), cartaoController.remover);

module.exports = router;
