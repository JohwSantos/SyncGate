const express = require('express');
const relatorioController = require('../controllers/relatorio.controller');

const router = express.Router();

// GET /api/relatorios/resumo       — totais gerais + dia atual
// GET /api/relatorios/por-dia      — acessos agrupados por dia (?dias=30)
// GET /api/relatorios/por-semana   — acessos agrupados por semana (?semanas=12)
// GET /api/relatorios/por-mes      — acessos agrupados por mês (?meses=12)
// GET /api/relatorios/por-ano      — acessos agrupados por ano
// GET /api/relatorios/por-hora-hoje — distribuição por hora (hoje)

router.get('/resumo', relatorioController.resumoGeral);
router.get('/por-dia', relatorioController.acessosPorDia);
router.get('/por-semana', relatorioController.acessosPorSemana);
router.get('/por-mes', relatorioController.acessosPorMes);
router.get('/por-ano', relatorioController.acessosPorAno);
router.get('/por-hora-hoje', relatorioController.acessosPorHoraHoje);

module.exports = router;
