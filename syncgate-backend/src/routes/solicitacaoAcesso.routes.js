const express = require('express');
const solicitacaoController = require('../controllers/solicitacaoAcesso.controller');
const permitirPerfil = require('../middlewares/permissao.middleware');

const router = express.Router();

// GET   /api/solicitacoes           -> lista todas (qualquer perfil autenticado)
// GET   /api/solicitacoes/:id       -> busca uma (qualquer perfil autenticado)
// POST  /api/solicitacoes           -> cria (qualquer perfil autenticado, inclusive operador)
// PATCH /api/solicitacoes/:id/aprovar  -> aprova (gestor, master)
// PATCH /api/solicitacoes/:id/rejeitar -> rejeita (gestor, master)

router.get('/', solicitacaoController.listar);
router.get('/:id', solicitacaoController.buscarPorId);
router.post('/', solicitacaoController.criar);
router.patch('/:id/aprovar', permitirPerfil('gestor', 'master'), solicitacaoController.aprovar);
router.patch('/:id/rejeitar', permitirPerfil('gestor', 'master'), solicitacaoController.rejeitar);

module.exports = router;
