const express = require('express');
const verificarToken = require('../middlewares/auth.middleware');

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const usuarioRoutes = require('./usuario.routes');
const cartaoRoutes = require('./cartao.routes');
const dispositivoRoutes = require('./dispositivo.routes');
const acessoRoutes = require('./acesso.routes');
const horarioRoutes = require('./horarioAcesso.routes');
const solicitacaoRoutes = require('./solicitacaoAcesso.routes');

const router = express.Router();

// Este arquivo centraliza todas as rotas da aplicação.
//
// Rotas públicas (não exigem login):
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);

// Rota do dispositivo físico (ESP32): não é uma pessoa logada no
// painel, então não passa pelo verificarToken aqui. A rota de
// histórico dentro de acesso.routes.js é protegida separadamente,
// dentro do próprio arquivo de rotas.
router.use('/acesso', acessoRoutes);

// Rotas administrativas: todas exigem um token válido (verificarToken).
router.use('/usuarios', verificarToken, usuarioRoutes);
router.use('/cartoes', verificarToken, cartaoRoutes);
router.use('/dispositivos', verificarToken, dispositivoRoutes);
router.use('/horarios', verificarToken, horarioRoutes);
router.use('/solicitacoes', verificarToken, solicitacaoRoutes);

module.exports = router;
