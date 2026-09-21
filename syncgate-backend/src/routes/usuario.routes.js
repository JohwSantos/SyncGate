const express = require('express');
const usuarioController = require('../controllers/usuario.controller');
const permitirPerfil = require('../middlewares/permissao.middleware');

const router = express.Router();

// GET    /api/usuarios           -> lista todos (qualquer perfil autenticado)
// GET    /api/usuarios/:id       -> busca um usuário (qualquer perfil autenticado)
// POST   /api/usuarios           -> cria um usuário (gestor, master)
// PUT    /api/usuarios/:id       -> atualiza dados (gestor, master)
// PATCH  /api/usuarios/:id/status -> bloqueia/desbloqueia (gestor, master)
// DELETE /api/usuarios/:id       -> exclui definitivamente (gestor, master)

router.get('/', usuarioController.listar);
router.get('/:id', usuarioController.buscarPorId);
router.post('/', permitirPerfil('gestor', 'master'), usuarioController.criar);
router.put('/:id', permitirPerfil('gestor', 'master'), usuarioController.atualizar);
router.patch('/:id/status', permitirPerfil('gestor', 'master'), usuarioController.definirStatus);
router.delete('/:id', permitirPerfil('gestor', 'master'), usuarioController.remover);

module.exports = router;
