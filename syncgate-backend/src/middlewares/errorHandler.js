// Middleware de tratamento de erros do Express.
// Ele precisa ter exatamente 4 parâmetros (err, req, res, next)
// para o Express reconhecer como um "error handler".
//
// A ideia: em vez de cada controller tratar erro do seu próprio jeito,
// qualquer erro lançado (throw) ou passado via next(err) cai aqui,
// e devolvemos uma resposta JSON padronizada para quem chamou a API.
function errorHandler(err, req, res, next) {
  console.error(err);

  const status = err.status || 500;
  const message = err.message || 'Erro interno do servidor';

  res.status(status).json({
    erro: message,
  });
}

module.exports = errorHandler;
