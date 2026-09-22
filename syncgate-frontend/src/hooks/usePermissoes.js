import { useAuth } from '../context/AuthContext';
import { PERMISSOES, temPermissao } from '../utils/permissoes';

// Hook simples: qualquer tela pode chamar usePermissoes() e
// receber booleanos prontos, em vez de repetir a lógica de
// "checar o perfil do usuário logado" em cada página.
export function usePermissoes() {
  const { usuario } = useAuth();
  const perfil = usuario?.perfil;

  return {
    podeGerenciarUsuarios: temPermissao(perfil, PERMISSOES.usuarios),
    podeGerenciarCartoesDispositivos: temPermissao(perfil, PERMISSOES.cartoesDispositivos),
    podeGerenciarHorarios: temPermissao(perfil, PERMISSOES.horarios),
    podeAprovarSolicitacoes: temPermissao(perfil, PERMISSOES.aprovarSolicitacoes),
  };
}
