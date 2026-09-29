const express = require('express');
const multer = require('multer');
const csvController = require('../controllers/csv.controller');
const permitirPerfil = require('../middlewares/permissao.middleware');

const router = express.Router();

// Multer em memória: o arquivo fica em req.file.buffer,
// sem gravar nada no disco do servidor.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // máximo 5 MB
  fileFilter: (req, file, cb) => {
    // Aceita apenas .csv
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos .csv são aceitos'));
    }
  },
});

// ---- EXPORTAÇÃO (GET) ----
// Qualquer perfil autenticado pode exportar (é leitura).
// O token já é exigido pelo routes/index.js para este grupo.

// GET /api/csv/usuarios/exportar
router.get('/usuarios/exportar', csvController.exportarUsuarios);

// GET /api/csv/cartoes/exportar
router.get('/cartoes/exportar', csvController.exportarCartoes);

// GET /api/csv/dispositivos/exportar
router.get('/dispositivos/exportar', csvController.exportarDispositivos);

// GET /api/csv/historico/exportar
router.get('/historico/exportar', csvController.exportarHistorico);


// ---- IMPORTAÇÃO (POST) ----
// Segue as mesmas permissões de quem gerencia cada entidade:
// - Usuários: gestor, master
// - Cartões: master
// - Dispositivos: master

// POST /api/csv/usuarios/importar  (multipart/form-data, campo "arquivo")
router.post(
  '/usuarios/importar',
  permitirPerfil('gestor', 'master'),
  upload.single('arquivo'),
  csvController.importarUsuarios
);

// POST /api/csv/cartoes/importar
router.post(
  '/cartoes/importar',
  permitirPerfil('master'),
  upload.single('arquivo'),
  csvController.importarCartoes
);

// POST /api/csv/dispositivos/importar
router.post(
  '/dispositivos/importar',
  permitirPerfil('master'),
  upload.single('arquivo'),
  csvController.importarDispositivos
);

module.exports = router;
