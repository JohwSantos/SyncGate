const express = require('express');
const { testConnection } = require('../config/database');

const router = express.Router();

// Rota simples só para confirmarmos que a API está no ar
// e, opcionalmente, se o banco de dados está acessível.
// GET /health
router.get('/', async (req, res) => {
  const dbConectado = await testConnection();

  res.json({
    status: 'ok',
    servico: 'SyncGate API',
    banco_de_dados: dbConectado ? 'conectado' : 'indisponível',
    horario: new Date().toISOString(),
  });
});

module.exports = router;
