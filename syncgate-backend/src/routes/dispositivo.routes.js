const express = require('express');
const dispositivoController = require('../controllers/dispositivo.controller');
const permitirPerfil = require('../middlewares/permissao.middleware');

const router = express.Router();

// GET   /api/dispositivos          -> lista todos (qualquer perfil autenticado)
// GET   /api/dispositivos/:id      -> busca um dispositivo (qualquer perfil autenticado)
// POST  /api/dispositivos          -> cadastra (master)
// PUT   /api/dispositivos/:id      -> atualiza (master)
// PATCH /api/dispositivos/:id/status -> muda status (master)
// DELETE /api/dispositivos/:id      -> exclui (master)

router.get('/', dispositivoController.listar);
router.get('/:id', dispositivoController.buscarPorId);
router.post('/', permitirPerfil('master'), dispositivoController.criar);
router.put('/:id', permitirPerfil('master'), dispositivoController.atualizar);
router.patch('/:id/status', permitirPerfil('master'), dispositivoController.atualizarStatus);
router.delete('/:id', permitirPerfil('master'), dispositivoController.remover);

module.exports = router;
