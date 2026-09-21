const express = require('express');
const horarioController = require('../controllers/horarioAcesso.controller');
const permitirPerfil = require('../middlewares/permissao.middleware');

const router = express.Router();

// GET    /api/horarios                    -> lista todas (qualquer perfil autenticado)
// GET    /api/horarios/usuario/:idUsuario -> regras de um usuário (qualquer perfil autenticado)
// POST   /api/horarios                     -> cria uma regra (gestor, master)
// DELETE /api/horarios/:id                  -> remove uma regra (gestor, master)

router.get('/', horarioController.listar);
router.get('/usuario/:idUsuario', horarioController.listarPorUsuario);
router.post('/', permitirPerfil('gestor', 'master'), horarioController.criar);
router.delete('/:id', permitirPerfil('gestor', 'master'), horarioController.remover);

module.exports = router;
