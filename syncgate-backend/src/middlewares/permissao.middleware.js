// Middleware de autorização por perfil. Diferente do verificarToken
// (que só confirma "esta pessoa está logada"), este confere
// "esta pessoa tem o PERFIL necessário pra fazer isso" — por isso
// ele sempre é usado DEPOIS do verificarToken numa rota, já que
// depende de req.usuarioLogado já existir.
//
// Uso: router.post('/', verificarToken, permitirPerfil('gestor', 'master'), controller.criar)
// (o verificarToken já é aplicado uma vez em routes/index.js para
// o grupo inteiro de rotas administrativas — aqui só adicionamos
// a checagem extra de perfil nas rotas que precisam dela)
function permitirPerfil(...perfisPermitidos) {
  return (req, res, next) => {
    const perfilDoUsuario = req.usuarioLogado && req.usuarioLogado.perfil;

    if (!perfilDoUsuario || !perfisPermitidos.includes(perfilDoUsuario)) {
      return res.status(403).json({
        erro: `Ação restrita a: ${perfisPermitidos.join(', ')}`,
      });
    }

    next();
  };
}

module.exports = permitirPerfil;
