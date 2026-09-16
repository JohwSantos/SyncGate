import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Envolve qualquer tela que exija login. Se não houver usuário
// autenticado, manda a pessoa de volta para /login em vez de
// mostrar a tela (a API já bloquearia a requisição de qualquer
// forma, mas isso evita que o painel pareça "quebrado").
export default function RotaPrivada({ children }) {
  const { estaLogado } = useAuth();

  if (!estaLogado) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
