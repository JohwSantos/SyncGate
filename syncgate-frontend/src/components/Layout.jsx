import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut, Menu } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { usuario, logout } = useAuth();
  const [menuAberto, setMenuAberto] = useState(false);

  return (
    <div style={estilos.pagina}>
      <Sidebar aberto={menuAberto} aoNavegar={() => setMenuAberto(false)} />

      {/* Fundo escuro atrás do menu quando ele está aberto em telas
          pequenas — clicar nele fecha o menu, como um modal. */}
      <div
        className={`sg-sidebar-backdrop ${menuAberto ? 'aberto' : ''}`}
        onClick={() => setMenuAberto(false)}
      />

      <div style={estilos.areaConteudo}>
        <header style={estilos.topo}>
          <button
            className="sg-botao-menu"
            onClick={() => setMenuAberto((atual) => !atual)}
            style={estilos.botaoMenu}
            aria-label="Abrir menu"
          >
            <Menu size={20} />
          </button>

          <div />

          <div style={estilos.usuarioLogado}>
            <div style={estilos.avatar}>{usuario?.nome?.charAt(0) ?? '?'}</div>
            <div>
              <p style={estilos.nomeUsuario}>{usuario?.nome}</p>
              <p style={estilos.perfilUsuario}>{usuario?.perfil ?? usuario?.tipo}</p>
            </div>
            <button onClick={logout} style={estilos.botaoSair} title="Sair">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <main style={estilos.conteudo} className="sg-conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

const estilos = {
  pagina: {
    display: 'flex',
    minHeight: '100vh',
  },
  areaConteudo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
  },
  topo: {
    height: '4rem',
    flexShrink: 0,
    background: 'var(--cor-superficie)',
    borderBottom: '1px solid var(--cor-borda)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
  },
  botaoMenu: {
    border: 'none',
    background: 'transparent',
    color: 'var(--cor-texto)',
    padding: '0.4rem',
    borderRadius: 'var(--raio-pequeno)',
    display: 'flex',
  },
  usuarioLogado: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.7rem',
  },
  avatar: {
    width: '2.1rem',
    height: '2.1rem',
    borderRadius: '50%',
    background: 'var(--cor-blue-50)',
    color: 'var(--cor-blue-600)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontFamily: 'var(--fonte-display)',
  },
  nomeUsuario: {
    fontSize: '0.85rem',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  perfilUsuario: {
    fontSize: '0.75rem',
    color: 'var(--cor-texto-suave)',
    textTransform: 'capitalize',
  },
  botaoSair: {
    border: 'none',
    background: 'transparent',
    color: 'var(--cor-texto-suave)',
    padding: '0.4rem',
    borderRadius: 'var(--raio-pequeno)',
    display: 'flex',
    marginLeft: '0.3rem',
  },
  conteudo: {
    flex: 1,
    padding: '1.75rem',
    overflow: 'auto',
  },
};
