// Mesma matriz de permissões do backend
// (syncgate-backend/src/middlewares/permissao.middleware.js) —
// mantida aqui só para a interface esconder ações que a pessoa
// não teria permissão de completar. Quem decide de verdade
// continua sendo o backend; isso é só uma conveniência de UX.
export const PERMISSOES = {
  usuarios: ['gestor', 'master'],
  cartoesDispositivos: ['master'],
  horarios: ['gestor', 'master'],
  aprovarSolicitacoes: ['gestor', 'master'],
};

export function temPermissao(perfil, permissoesNecessarias) {
  return permissoesNecessarias.includes(perfil);
}
