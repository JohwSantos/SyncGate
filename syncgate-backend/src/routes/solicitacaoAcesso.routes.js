const express = require('express');
const solicitacaoController = require('../controllers/solicitacaoAcesso.controller');

const router = express.Router();

// GET   /api/solicitacoes           -> lista todas
// GET   /api/solicitacoes/:id       -> busca uma
// POST  /api/solicitacoes           -> cria uma solicitação (status: pendente)
// PATCH /api/solicitacoes/:id/aprovar
// PATCH /api/solicitacoes/:id/rejeitar

router.get('/', solicitacaoController.listar);
router.get('/:id', solicitacaoController.buscarPorId);
router.post('/', solicitacaoController.criar);
router.patch('/:id/aprovar', solicitacaoController.aprovar);
router.patch('/:id/rejeitar', solicitacaoController.rejeitar);

module.exports = router;
