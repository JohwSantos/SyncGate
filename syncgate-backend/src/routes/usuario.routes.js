const express = require('express');
const usuarioController = require('../controllers/usuario.controller');

const router = express.Router();

// GET    /api/usuarios           -> lista todos
// GET    /api/usuarios/:id       -> busca um usuário
// POST   /api/usuarios           -> cria um usuário
// PUT    /api/usuarios/:id       -> atualiza dados de um usuário
// PATCH  /api/usuarios/:id/status -> bloqueia/desbloqueia (RF09)

router.get('/', usuarioController.listar);
router.get('/:id', usuarioController.buscarPorId);
router.post('/', usuarioController.criar);
router.put('/:id', usuarioController.atualizar);
router.patch('/:id/status', usuarioController.definirStatus);
router.delete('/:id', usuarioController.remover);

module.exports = router;
