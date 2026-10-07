import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { temPermissao } from '../utils/permissoes';

export default function RotaPermissao({ perfis, children }) {
  const { usuario } = useAuth();

  if (!temPermissao(usuario?.perfil, perfis)) {
    return <Navigate to="/acesso-negado" replace />;
  }

  return children;
}