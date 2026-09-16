const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');

// Guardamos a instância do socket.io aqui, num módulo separado,
// para que qualquer service consiga emitir eventos (via emitir())
// sem precisar importar o socket.io inteiro em cada arquivo.
let io = null;

function inicializar(servidorHttp) {
  io = new Server(servidorHttp, {
    cors: { origin: '*' }, // o painel React roda em outra porta/origem
  });

  // Mesma ideia do middleware verificarToken das rotas REST: só
  // quem apresentar um token JWT válido consegue estabelecer a
  // conexão WebSocket. O token é enviado pelo cliente em
  // `socket.handshake.auth.token` (não como parte da URL).
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Token não informado'));
    }

    try {
      socket.usuarioLogado = jwt.verify(token, env.jwtSecret);
      next();
    } catch (erro) {
      next(new Error('Token inválido ou expirado'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Painel conectado: ${socket.usuarioLogado.login}`);

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Painel desconectado: ${socket.usuarioLogado.login}`);
    });
  });

  return io;
}

// Função usada pelos services para avisar todo mundo conectado
// que algo aconteceu. Se o WebSocket ainda não foi inicializado
// (por exemplo, durante testes que não sobem o servidor HTTP
// completo), simplesmente não faz nada — não quebra a aplicação.
function emitir(evento, dados) {
  if (io) {
    io.emit(evento, dados);
  }
}

module.exports = { inicializar, emitir };
