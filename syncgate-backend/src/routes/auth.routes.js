const express = require('express');
const authController = require('../controllers/auth.controller');
const { limitadorLogin } = require('../middlewares/rateLimit.middleware');

const router = express.Router();

// POST /api/auth/login -> autentica e devolve um token JWT
//                        (máx. 10 tentativas erradas a cada 15 min)
router.post('/login', limitadorLogin, authController.login);

module.exports = router;
