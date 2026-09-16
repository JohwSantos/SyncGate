const express = require('express');
const horarioController = require('../controllers/horarioAcesso.controller');

const router = express.Router();

// GET    /api/horarios                 -> lista todas as regras
// GET    /api/horarios/usuario/:idUsuario -> regras de um usuário
// POST   /api/horarios                  -> cria uma regra (RN06)
// DELETE /api/horarios/:id               -> remove uma regra

router.get('/', horarioController.listar);
router.get('/usuario/:idUsuario', horarioController.listarPorUsuario);
router.post('/', horarioController.criar);
router.delete('/:id', horarioController.remover);

module.exports = router;
