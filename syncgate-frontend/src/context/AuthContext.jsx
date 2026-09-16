import { createContext, useContext, useState, useCallback } from 'react';
import api from '../api/client';

// Este contexto guarda "quem está logado" de um jeito que qualquer
// tela do painel consegue consultar (useAuth()), sem precisar
// passar o usuário e o token manualmente por toda a árvore de
// componentes.
const AuthContext = createContext(null);

function lerUsuarioSalvo() {
  const bruto = localStorage.getItem('syncgate_usuario');
  return bruto ? JSON.parse(bruto) : null;
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(lerUsuarioSalvo);

  const login = useCallback(async (loginDigitado, senha) => {
    const { token, usuario: usuarioLogado } = await api.post('/auth/login', {
      login: loginDigitado,
      senha,
    });

    localStorage.setItem('syncgate_token', token);
    localStorage.setItem('syncgate_usuario', JSON.stringify(usuarioLogado));
    setUsuario(usuarioLogado);

    return usuarioLogado;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('syncgate_token');
    localStorage.removeItem('syncgate_usuario');
    setUsuario(null);
  }, []);

  const valor = {
    usuario,
    estaLogado: !!usuario,
    login,
    logout,
  };

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) {
    throw new Error('useAuth precisa ser usado dentro de um <AuthProvider>');
  }
  return contexto;
}
