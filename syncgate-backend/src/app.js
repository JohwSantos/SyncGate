const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const env = require('./config/env');

// Cria a aplicação Express
const app = express();

// Atrás de um proxy (ex.: Azure), usa o IP real do cliente.
// Ver TRUST_PROXY em config/env.js.
if (env.trustProxy > 0) {
  app.set('trust proxy', env.trustProxy);
}

// Só o painel do SyncGate (CORS_ORIGIN) pode chamar a API pelo
// navegador; outros sites são recusados pelo próprio navegador.
app.use(cors({ origin: env.corsOrigens }));

// Permite que a API receba e interprete corpos de requisição em JSON
// (necessário para receber dados em POST/PUT, como cadastro de usuário)
app.use(express.json());

// Todas as rotas da API ficam sob o prefixo /api
// Ex: GET /api/health
app.use('/api', routes);

// Middleware de erro. Precisa ser o ÚLTIMO app.use(),
// pois o Express só chama isso quando algo dá errado.
app.use(errorHandler);

module.exports = app;
