const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const websocket = require('./src/websocket/socket');

// Antes, o Express subia o servidor sozinho (app.listen). Agora
// criamos o servidor HTTP manualmente, porque o Socket.io precisa
// se "acoplar" a esse mesmo servidor para funcionar — ele não
// consegue rodar em cima só do objeto `app` do Express.
const servidorHttp = http.createServer(app);

websocket.inicializar(servidorHttp);

servidorHttp.listen(env.port, () => {
  console.log(`SyncGate API rodando em http://localhost:${env.port}`);
  console.log(`Teste em: http://localhost:${env.port}/api/health`);
  console.log('WebSocket disponível na mesma porta.');
});
