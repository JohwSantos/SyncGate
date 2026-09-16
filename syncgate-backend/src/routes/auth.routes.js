const express = require('express');
const authController = require('../controllers/auth.controller');

const router = express.Router();

// POST /api/auth/login -> autentica e devolve um token JWT
router.post('/login', authController.login);

module.exports = router;
