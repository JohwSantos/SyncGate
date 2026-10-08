import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { LogOut, Menu, Moon, Sun } from 'lucide-react';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { useTema } from '../context/TemaContext';

// Mapa de rotas para titulos exibidos no header
const TITULOS = {
  '/dashboard':             'Dashboard',
  '/usuarios':              'Usuarios',
  '/cartoes':               'Cartoes RFID',
  '/dispositivos':          'Dispositivos',
  '/horarios':              'Horarios',
  '/solicitacoes':          'Solicitacoes',
  '/historico':             'Historico de Acessos',
  '/importacao-exportacao': 'Importar / Exportar',
  '/acesso-negado':         'Acesso negado',
};

export default function Layout() {
  const { usuario, logout } = useAuth();
  const { tema, alternarTema } = useTema();
  const [menuAberto, setMenuAberto] = useState(false);
  const location = useLocation();

  const tituloAtual = TITULOS[location.pathname] ?? '';

  return (
    <div className="sg-app">
      <Sidebar aberto={menuAberto} aoNavegar={() => setMenuAberto(false)} />

      {/* Backdrop mobile */}
      <div
        className={`sg-sidebar-backdrop${menuAberto ? ' aberto' : ''}`}
        onClick={() => setMenuAberto(false)}
        aria-hidden="true"
      />

      <div className="sg-content-area">
        {/* Header */}
        <header className="sg-header">
          {/* Botao menu (so mobile) */}
          <button
            className="sg-btn-menu"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={menuAberto}
            aria-controls="menu-lateral"
          >
            <Menu size={20} />
          </button>

          {/* Titulo da pagina atual */}
          <span className="sg-header-title">{tituloAtual}</span>

          {/* Acoes do header */}
          <div className="sg-header-actions">
            {/* Alternar tema */}
            <button
              type="button"
              className="sg-btn-theme"
              onClick={alternarTema}
              aria-label={tema === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              aria-pressed={tema === 'dark'}
              title={tema === 'dark' ? 'Tema claro' : 'Tema escuro'}
            >
              {tema === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            <div className="sg-header-sep" aria-hidden="true" />

            {/* Usuario logado */}
            <div className="sg-user-widget">
              <div className="sg-user-avatar" aria-hidden="true">
                {usuario?.nome?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
              <div className="sg-user-info">
                <span className="sg-user-name">{usuario?.nome}</span>
                <span className="sg-user-role">{usuario?.perfil ?? usuario?.tipo ?? 'usuario'}</span>
              </div>
              <button
                type="button"
                className="sg-btn-logout"
                onClick={logout}
                title="Sair"
                aria-label="Sair da conta"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Conteudo da pagina */}
        <main className="sg-main sg-conteudo">
          <Outlet />
        </main>
      </div>
    </div>
  );
}