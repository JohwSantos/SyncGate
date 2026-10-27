const crypto = require('crypto');

// Funções da chave secreta dos dispositivos (ESP32).
//
// Por que SHA-256 e não bcrypt (que usamos nas senhas)?
// O bcrypt é lento DE PROPÓSITO, para dificultar adivinhar senhas
// curtas criadas por pessoas. A chave do dispositivo é gerada pelo
// sistema: são 32 bytes aleatórios, impossíveis de adivinhar. Então
// um hash rápido já é seguro, e a validação de cada cartão
// continua instantânea (bcrypt somaria ~100 ms a cada leitura).

// Gera uma chave nova: 32 bytes aleatórios em hexadecimal
// (64 caracteres, só 0-9 e a-f — fácil de colar no código do ESP32).
function gerarChave() {
  return crypto.randomBytes(32).toString('hex');
}

// Transforma a chave no hash que guardamos no banco.
function calcularHash(chave) {
  return crypto.createHash('sha256').update(String(chave)).digest('hex');
}

// Compara a chave recebida com o hash salvo. timingSafeEqual leva
// sempre o mesmo tempo, dê certo ou errado — uma comparação comum
// (===) para no primeiro caractere diferente, e medir esse tempo
// poderia ajudar alguém a descobrir a chave aos poucos.
function chaveConfere(chaveRecebida, hashSalvo) {
  if (!chaveRecebida || !hashSalvo) return false;
  const recebido = Buffer.from(calcularHash(chaveRecebida), 'hex');
  const salvo = Buffer.from(hashSalvo, 'hex');
  return recebido.length === salvo.length && crypto.timingSafeEqual(recebido, salvo);
}

module.exports = { gerarChave, calcularHash, chaveConfere };
