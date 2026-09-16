const express = require('express');
const dispositivoController = require('../controllers/dispositivo.controller');

const router = express.Router();

// GET   /api/dispositivos          -> lista todos
// GET   /api/dispositivos/:id      -> busca um dispositivo
// POST  /api/dispositivos          -> cadastra um dispositivo
// PUT   /api/dispositivos/:id      -> atualiza descricao/localizacao/ip
// PATCH /api/dispositivos/:id/status -> muda status (online/offline/manutencao)

router.get('/', dispositivoController.listar);
router.get('/:id', dispositivoController.buscarPorId);
router.post('/', dispositivoController.criar);
router.put('/:id', dispositivoController.atualizar);
router.patch('/:id/status', dispositivoController.atualizarStatus);
router.delete('/:id', dispositivoController.remover);

module.exports = router;
