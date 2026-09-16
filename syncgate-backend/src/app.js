const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');

// Cria a aplicação Express
const app = express();

// Permite que o painel React (rodando em outra porta/origem)
// consiga fazer requisições para esta API.
app.use(cors());

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
