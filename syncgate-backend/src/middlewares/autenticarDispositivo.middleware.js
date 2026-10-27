const dispositivoModel = require('../models/dispositivo.model');
const { chaveConfere } = require('../utils/chaveDispositivo');

// Middleware que protege a rota usada pelo ESP32 (/acesso/validar).
// É o equivalente ao verificarToken, mas para HARDWARE: em vez de
// um token de login, o dispositivo prova quem é enviando a chave
// secreta que foi gerada para ele no painel.
//
// O ESP32 envia:
//   corpo:     { "uid": "A1B2C3D4", "id_dispositivo": 1 }
//   cabeçalho: X-Dispositivo-Chave: <chave de 64 caracteres>
//
// Por que 401 também para dispositivo inexistente (e não 404)?
// Se respondêssemos 404 para "não existe" e 401 para "chave errada",
// alguém poderia descobrir quais ids de dispositivo existem só
// testando. Com a mesma resposta para os dois casos, não dá.
async function autenticarDispositivo(req, res, next) {
  try {
    const chave = req.get('X-Dispositivo-Chave');
    const idDispositivo = Number(req.body && req.body.id_dispositivo);

    if (!chave) {
      return res.status(401).json({ erro: 'Chave do dispositivo não informada (cabeçalho X-Dispositivo-Chave)' });
    }

    if (!Number.isInteger(idDispositivo) || idDispositivo <= 0) {
      return res.status(400).json({ erro: 'id_dispositivo inválido' });
    }

    const hashSalvo = await dispositivoModel.buscarHashDaChave(idDispositivo);

    if (!chaveConfere(chave, hashSalvo)) {
      return res.status(401).json({ erro: 'Dispositivo ou chave inválidos' });
    }

    next();
  } catch (erro) {
    next(erro);
  }
}

module.exports = autenticarDispositivo;
